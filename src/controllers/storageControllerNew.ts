import { Response } from 'express'
// Para Cloudflare R2, instalar: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
// import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
// import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { linkModel } from '../models/linkModel'
import { userModel } from '../models/userModel'
import { RequestWithUser } from '../types/express'
import { constants } from '../utils/constants'

// Tipos temporales para desarrollo - remover cuando se instalen las dependencias
/* eslint-disable @typescript-eslint/no-explicit-any */
declare const S3Client: any
declare const PutObjectCommand: any
declare const DeleteObjectCommand: any
declare const ListObjectsV2Command: any
declare const GetObjectCommand: any
declare const HeadObjectCommand: any
declare const getSignedUrl: any

// Configuración de Cloudflare R2
const r2Client = new S3Client({
  region: 'auto', // Cloudflare R2 usa 'auto' como región
  endpoint: process.env.R2_ENDPOINT, // Ejemplo: https://[account_id].r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? ''
  }
})

const BUCKET_NAME = process.env.R2_BUCKET_NAME ?? 'default-bucket'

/* eslint-disable @typescript-eslint/no-extraneous-class */
export class storageControllerNew {
  /**
   * Helper para generar URL firmada de lectura
   */
  private static async getSignedReadUrl (key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    })
    return getSignedUrl(r2Client, command, { expiresIn })
  }

  /**
   * Helper para generar URL firmada de subida
   */
  private static async getSignedUploadUrl (key: string, expiresIn = 3600): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    })
    return getSignedUrl(r2Client, command, { expiresIn })
  }

  static async getBackgroundsMiniatures (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      const user = req.user?._id
      if (user === undefined || user === null || user === '') {
        return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
      }

      const listCommand = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: 'miniatures/'
      })

      const response = await r2Client.send(listCommand)
      const objects = response.Contents ?? []

      const backgroundsPromises = objects.map(async (obj: any) => {
        if ((obj.Key as string) === null || (obj.Key as string) === undefined || (obj.Key as string) === '') return null

        const signedUrl = await this.getSignedReadUrl(obj.Key as string)
        return {
          url: signedUrl,
          nombre: (obj.Key as string).split('/').pop() ?? (obj.Key as string)
        }
      })

      const backgrounds = (await Promise.all(backgroundsPromises)).filter(Boolean)
      return res.status(200).json({ ...constants.API_SUCCESS_RESPONSE, data: backgrounds })
    } catch (err) {
      console.error('Error al leer la carpeta:', err)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE })
    }
  }

  static async uploadImage (req: RequestWithUser, res: Response): Promise<Response> {
    const email = req.user?.email
    const id = req.user?._id
    const linkId = req.body.linkId

    if (email === undefined || email === null || email === '') {
      return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
    }

    if (req.file === undefined || req.file === null) {
      return res.status(400).json({ ...constants.API_FAIL_RESPONSE, error: 'No hemos recibido imagen' })
    }

    try {
      const file = req.file
      const uniqueSuffix = Date.now().toString() + '-' + Math.round(Math.random() * 1E9).toString()
      const extension = typeof file?.originalname === 'string' ? String(file.originalname.split('.').pop() ?? 'jpg') : 'jpg'

      // Construir la clave del objeto en R2
      const key = `${email}/images/linkImages/${uniqueSuffix}.${extension}`

      const putCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype
      })

      await r2Client.send(putCommand)

      // Generar URL firmada para acceso
      const signedUrl = await this.getSignedReadUrl(key)

      try {
        const resultadoDb = await linkModel.setImagesInDb({ url: key, user: id, id: linkId }) // Guardamos la key, no la URL firmada
        return res.status(200).json({
          ...constants.API_SUCCESS_RESPONSE,
          data: {
            ...resultadoDb,
            signedUrl // Devolvemos la URL firmada para uso inmediato
          }
        })
      } catch (error) {
        return res.status(500).json({ ...constants.API_FAIL_RESPONSE, error: 'Error al guardar la imagen en la base de datos' })
      }
    } catch (error) {
      console.error('Error al subir el archivo:', error)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE, error: 'Error al subir el archivo' })
    }
  }

  static async deleteImage (req: RequestWithUser, res: Response): Promise<Response> {
    const email = req.user?.email
    const id = req.user?._id
    const linkId = req.body.id
    const imageKey = req.body.image // Ahora esperamos la key, no la URL

    if (email === undefined || email === null || email === '') {
      return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
    }

    if (imageKey === undefined || imageKey === null || imageKey === '') {
      return res.status(400).json({ ...constants.API_FAIL_RESPONSE, error: 'No hemos recibido la imagen en la petición' })
    }

    try {
      // Obtener metadata del objeto para conocer el tamaño
      const headCommand = new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: imageKey
      })

      const metadata = await r2Client.send(headCommand)
      const size = (metadata.ContentLength as number) ?? 0

      // Eliminar el objeto de R2
      const deleteCommand = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: imageKey
      })

      await r2Client.send(deleteCommand)

      try {
        // Restar el tamaño de la imagen al usuario
        const userResult = await userModel.getUser({ email })
        if ('error' in userResult) {
          return res.status(404).json({ ...constants.API_FAIL_RESPONSE, error: 'Usuario no encontrado' })
        }

        const quota = userResult.quota
        if (quota === undefined) {
          console.error('Error: cuota no definida')
          return res.status(500).json({ ...constants.API_FAIL_RESPONSE, error: 'Error interno del servidor' })
        }

        const newQuota = quota - size
        await userModel.editUser({ email, fields: { quota: newQuota } })

        // Borrar la referencia de la imagen en base de datos
        await linkModel.deleteImageOnDb({ url: imageKey, user: id, id: linkId })
        return res.status(200).json({ ...constants.API_SUCCESS_RESPONSE, message: 'Imagen eliminada exitosamente' })
      } catch (error) {
        console.error('Error al eliminar la imagen de la base de datos:', error)
        return res.status(500).json({ ...constants.API_FAIL_RESPONSE, error: 'Error al eliminar la imagen de la base de datos' })
      }
    } catch (error) {
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE, error: 'Error al eliminar la imagen' })
    }
  }

  static async uploadIcon (req: RequestWithUser, res: Response): Promise<Response> {
    const file = req.file
    const user = req.user?.email
    const userId = req.user?._id
    const linkId = req.body.linkId

    if (user === undefined || user === null || user === '') {
      return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
    }

    // Si no hay imagen, ha elegido una de muestra
    if (file === undefined || file === null) {
      try {
        const filePath = req.body.filePath
        const resultadoDb = await linkModel.setLinkImgInDb({ url: filePath, user: userId, id: linkId })
        return res.status(200).json({ ...constants.API_SUCCESS_RESPONSE, data: resultadoDb })
      } catch (error) {
        console.error('Error al establecer la imagen en la base de datos:', error)
        return res.status(500).json({ ...constants.API_FAIL_RESPONSE, error: 'Error al establecer la imagen en la base de datos' })
      }
    }

    try {
      const uniqueSuffix = Date.now().toString() + '-' + Math.round(Math.random() * 1E9).toString()
      const extension = (file.originalname.split('.').pop() ?? 'jpg')
      const key = `${user}/images/icons/${uniqueSuffix}.${extension}`

      const putCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype
      })

      await r2Client.send(putCommand)
      const signedUrl = await this.getSignedReadUrl(key)

      try {
        await linkModel.setLinkImgInDb({ url: key, user: userId, id: linkId })
        return res.status(200).json({
          ...constants.API_SUCCESS_RESPONSE,
          data: {
            url: signedUrl,
            name: `${uniqueSuffix}.${extension}`,
            key
          }
        })
      } catch (error) {
        console.error('Error al establecer la imagen en la base de datos:', error)
        return res.status(500).json({ ...constants.API_FAIL_RESPONSE, error: 'Error al establecer la imagen en la base de datos' })
      }
    } catch (error) {
      console.error('Error al subir el archivo:', error)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE, error: 'Error al establecer la imagen en la base de datos' })
    }
  }

  static async deleteIcon (req: RequestWithUser, res: Response): Promise<Response> {
    const email = req.user?.email
    if (email === undefined || email === null || email === '') {
      return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
    }

    const imageName = String(req.body.image)
    const key = `${email}/images/icons/${imageName}`

    try {
      // Obtener metadata para el tamaño
      const headCommand = new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key
      })

      const metadata = await r2Client.send(headCommand)
      const size = (metadata.ContentLength as number) ?? 0

      const userResult = await userModel.getUser({ email })
      if ('error' in userResult) {
        return res.status(404).json({ ...constants.API_FAIL_RESPONSE, error: 'Usuario no encontrado' })
      }

      const quota = userResult.quota
      if (quota === undefined) {
        console.error('Error: cuota no definida')
        return res.status(500).json({ ...constants.API_FAIL_RESPONSE, error: 'Error interno del servidor' })
      }

      const newQuota = quota - size
      await userModel.editUser({ email, fields: { quota: newQuota } })

      // Eliminar el archivo de R2
      const deleteCommand = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key
      })

      await r2Client.send(deleteCommand)

      return res.status(200).json({ ...constants.API_SUCCESS_RESPONSE, message: 'Imagen eliminada exitosamente' })
    } catch (error) {
      console.error('Error al eliminar la imagen:', error)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE, error: 'Error al eliminar la imagen' })
    }
  }

  static async getLinkIcons (req: RequestWithUser, res: Response): Promise<Response> {
    const email = req.user?.email

    if (email === undefined || email === null || email === '') {
      return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
    }

    try {
      const listCommand = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: `${email}/images/icons/`
      })

      const response = await r2Client.send(listCommand)
      const objects = response.Contents ?? []

      const userIconsPromises = objects.map(async (obj: any) => {
        if ((obj.Key as string) === null || (obj.Key as string) === undefined || (obj.Key as string) === '') return null

        const signedUrl = await this.getSignedReadUrl(obj.Key as string)
        const fileName = (obj.Key as string).split('/').pop() ?? (obj.Key as string)

        return {
          url: signedUrl,
          nombre: fileName,
          clase: 'user',
          key: obj.Key // Incluir la key para futuras operaciones
        }
      })

      const userIcons = (await Promise.all(userIconsPromises)).filter(Boolean)
      return res.status(200).json({ ...constants.API_SUCCESS_RESPONSE, data: userIcons })
    } catch (err) {
      console.error('Error al leer la carpeta:', err)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE, error: 'Error al leer la carpeta' })
    }
  }

  static async getBackgroundUrl (req: RequestWithUser, res: Response): Promise<Response> {
    const email = req.user?.email

    if (email === undefined || email === null || email === '') {
      return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
    }

    const nombre = String(req.query.nombre ?? '')

    try {
      const key = `backgrounds/${nombre}`
      const signedUrl = await this.getSignedReadUrl(key)

      return res.status(200).json({ ...constants.API_SUCCESS_RESPONSE, data: signedUrl })
    } catch (error) {
      console.error('Error al obtener la URL de descarga:', error)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE, error: 'Error al obtener la URL de descarga' })
    }
  }

  static async getUserBackup (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      const email = req.user?.email

      if (email === undefined || email === null || email === '') {
        return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
      }

      const fileName = `${email}dataBackup.json`
      const key = `${email}/backups/${fileName}`
      const signedUrl = await this.getSignedReadUrl(key)

      return res.status(200).json({ ...constants.API_SUCCESS_RESPONSE, data: signedUrl })
    } catch (error) {
      console.error('Error al obtener la copia de seguridad del usuario:', error)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE, error: 'Error al obtener la copia de seguridad del usuario' })
    }
  }

  static async createUserBackup (req: RequestWithUser, res: Response): Promise<Response> {
    const email = req.user?.email

    if (email === undefined || email === null || email === '') {
      return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
    }

    try {
      // TODO: Implementar cuando estén disponibles los modelos necesarios
      return res.status(501).send({ error: 'Funcionalidad no implementada - faltan modelos desktopModel y columnModel' })

      /*
      // Ejemplo de implementación cuando estén los modelos:
      const data1 = await desktopModel.getAllDesktops({ user })
      const data2 = await columnModel.getAllColumns({ user })
      const data3 = await linkModel.getAllLinks({ user })

      const backupData = {
        escritorios: data1,
        columnas: data2,
        links: data3
      }

      const fileName = `${email}dataBackup.json`
      const key = `${email}/backups/${fileName}`

      const putCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: JSON.stringify(backupData),
        ContentType: 'application/json'
      })

      await r2Client.send(putCommand)
      const signedUrl = await this.getSignedReadUrl(key)

      return res.status(200).json({
        ...constants.API_SUCCESS_RESPONSE,
        data: { url: signedUrl, key: key }
      })
      */
    } catch (error) {
      const mensaje = 'Error al crear la copia de seguridad'
      console.error('Error al crear la copia de seguridad:', error)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE, error: mensaje })
    }
  }

  static async restoreUserBackup (req: RequestWithUser, res: Response): Promise<void> {
    const user = req.user?.name
    const file = req.file

    if (user === undefined || user === null || user === '') {
      res.status(401).json({ status: 'fail', message: 'Usuario no autenticado' })
      return
    }

    if (file === undefined || file === null) {
      res.status(400).json({ ...constants.API_FAIL_RESPONSE, error: 'No hemos recibido archivo' })
      return
    }

    try {
      // TODO: Implementar cuando estén disponibles los esquemas necesarios
      res.status(501).json({ ...constants.API_FAIL_RESPONSE, error: 'Funcionalidad no implementada - faltan esquemas escritorio y columna' })

      /*
      const buffer = file.buffer
      const str = buffer.toString()
      const data = JSON.parse(str)

      const { escritorios, columnas, links } = data

      await escritorio.deleteMany({ user })
      await columna.deleteMany({ user })
      await link.deleteMany({ user })

      // Restaurar datos...

      res.status(200).json({
        ...constants.API_SUCCESS_RESPONSE,
        message: 'Copia de seguridad restaurada exitosamente'
      })
      */
    } catch (error) {
      const mensaje = 'Error al restaurar la copia de seguridad'
      console.error('Error al restaurar la copia de seguridad:', error)
      res.status(500).json({ ...constants.API_FAIL_RESPONSE, error: mensaje })
    }
  }

  static async uploadProfileImage (req: RequestWithUser, res: Response): Promise<Response> {
    const email = req.user?.email

    if (email === undefined || email === null || email === '') {
      return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
    }

    if (req.file === undefined || req.file === null) {
      return res.status(400).json({ ...constants.API_FAIL_RESPONSE, error: 'No se proporcionó ningún archivo' })
    }

    const file = req.file

    try {
      // Primero, verificar si existe una imagen de perfil anterior y eliminarla
      const listCommand = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: `${email}/images/profile/`
      })

      const existingObjects = await r2Client.send(listCommand)
      let prevImageSize = 0

      // Eliminar imagen anterior si existe
      if (existingObjects.Contents !== null && existingObjects.Contents !== undefined && (existingObjects.Contents as any[]).length > 0) {
        const prevObject = (existingObjects.Contents as any[])[0]

        // Obtener tamaño de la imagen anterior
        const headCommand = new HeadObjectCommand({
          Bucket: BUCKET_NAME,
          Key: prevObject.Key as string
        })
        const prevMetadata = await r2Client.send(headCommand)
        prevImageSize = (prevMetadata.ContentLength as number) ?? 0

        // Eliminar imagen anterior
        const deleteCommand = new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: prevObject.Key as string
        })
        await r2Client.send(deleteCommand)
      }

      // Subir nueva imagen
      const uniqueSuffix = Date.now().toString() + '-' + Math.round(Math.random() * 1E9).toString()
      const extension = (file.originalname.split('.').pop() ?? 'jpg')
      const key = `${email}/images/profile/${uniqueSuffix}.${extension}`

      const putCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype
      })

      await r2Client.send(putCommand)
      const newSize = file.buffer.length // Usar el tamaño del buffer
      const difference = Number(newSize) - Number(prevImageSize)

      // Actualizar cuota del usuario
      const userResult = await userModel.getUser({ email })
      if ('error' in userResult) {
        return res.json({ ...constants.API_FAIL_RESPONSE, error: 'Usuario no encontrado' })
      }

      const quota = userResult.quota

      if (quota === undefined) {
        const newQuota = Number(newSize)
        if (newQuota > Number(process.env.MAX_USER_QUOTA)) {
          return res.json({ ...constants.API_FAIL_RESPONSE, error: 'No tienes espacio suficiente' })
        }
        await userModel.editUser({ email, fields: { quota: newQuota } })
      } else {
        const newQuota = Number(quota) + Number(difference)
        if (newQuota > Number(process.env.MAX_USER_QUOTA)) {
          return res.json({ ...constants.API_FAIL_RESPONSE, error: 'No tienes espacio suficiente' })
        }
        await userModel.editUser({ email, fields: { quota: newQuota } })
      }

      // Generar URL firmada para la imagen
      const signedUrl = await this.getSignedReadUrl(key)

      try {
        await userModel.updateProfileImage({ profileImage: key, email }) // Guardar la key, no la URL firmada
        return res.json({
          ...constants.API_SUCCESS_RESPONSE,
          message: '¡Archivo subido exitosamente!',
          data: {
            url: signedUrl,
            key
          }
        })
      } catch (error) {
        return res.json({ ...constants.API_FAIL_RESPONSE, error: 'Error al actualizar la imagen de perfil' })
      }
    } catch (error) {
      console.error('Error al subir el archivo:', error)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE, error: 'Error al subir el archivo' })
    }
  }

  static async deleteAllUserFiles ({ user }: { user: string }): Promise<{ message: string } | unknown> {
    try {
      const folders = [
        `${user}/images/profile/`,
        `${user}/backups/`,
        `${user}/images/icons/`,
        `${user}/images/linkImages/`
      ]

      // Eliminar archivos en cada carpeta
      for (const folder of folders) {
        const listCommand = new ListObjectsV2Command({
          Bucket: BUCKET_NAME,
          Prefix: folder
        })

        const response = await r2Client.send(listCommand)
        const objects = response.Contents ?? []

        if (objects.length > 0) {
          const deletePromises = objects.map(async (obj: any) => {
            if ((obj.Key as string) === null || (obj.Key as string) === undefined || (obj.Key as string) === '') return

            const deleteCommand = new DeleteObjectCommand({
              Bucket: BUCKET_NAME,
              Key: obj.Key as string
            })

            return r2Client.send(deleteCommand)
          })

          await Promise.all(deletePromises)
        }
      }

      // Eliminar cualquier archivo suelto en la carpeta del usuario
      const userListCommand = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: `${user}/`
      })

      const userResponse = await r2Client.send(userListCommand)
      const userObjects = userResponse.Contents ?? []

      if (userObjects.length > 0) {
        const deleteUserPromises = userObjects.map(async (obj: any) => {
          if ((obj.Key as string) === null || (obj.Key as string) === undefined || (obj.Key as string) === '') return

          const deleteCommand = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: obj.Key as string
          })

          return r2Client.send(deleteCommand)
        })

        await Promise.all(deleteUserPromises)
      }

      return { message: 'Todos los archivos del usuario han sido eliminados' }
    } catch (error) {
      return error
    }
  }

  /**
   * Nuevo método para generar URLs firmadas para acceso a archivos existentes
   */
  static async getSignedFileUrl (req: RequestWithUser, res: Response): Promise<Response> {
    const email = req.user?.email
    const { key, expiresIn = 3600 } = req.body

    if (email === undefined || email === null || email === '') {
      return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
    }

    if (key === null || key === undefined || key === '') {
      return res.status(400).json({ ...constants.API_FAIL_RESPONSE, error: 'Key del archivo requerida' })
    }

    try {
      // Verificar que el archivo pertenece al usuario
      if (!(key as string).startsWith(`${email}/`) && !(key as string).startsWith('miniatures/') && !(key as string).startsWith('backgrounds/')) {
        return res.status(403).json({ ...constants.API_FAIL_RESPONSE, error: 'Acceso no autorizado al archivo' })
      }

      const signedUrl = await this.getSignedReadUrl(key, expiresIn)

      return res.status(200).json({
        ...constants.API_SUCCESS_RESPONSE,
        data: {
          url: signedUrl,
          expiresIn
        }
      })
    } catch (error) {
      console.error('Error al generar URL firmada:', error)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE, error: 'Error al generar URL de acceso' })
    }
  }
}
