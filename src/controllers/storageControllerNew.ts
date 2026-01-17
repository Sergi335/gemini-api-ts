import { Response } from 'express'
// Para Cloudflare R2, instalar: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { categoryModel } from '../models/categoryModel'
import { LinkFields, linkModel, ValidatedLinkData } from '../models/linkModel'
import { userModel } from '../models/userModel'
import { RequestWithUser } from '../types/express'
import { constants } from '../utils/constants'
// import { checkStorageLimit } from '../middlewares/checkSubscriptionLimits'

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
  private static async getSignedReadUrl (key: string, expiresIn = 3600, forceDownload: boolean = false): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ...(forceDownload && {
        ResponseContentDisposition: `attachment; filename="${key.split('/').pop() ?? 'download'}"`
      })
    })
    return await getSignedUrl(r2Client, command, { expiresIn })
  }

  /**
   * Helper para generar URL firmada de subida
   */
  private static async getSignedUploadUrl (key: string, expiresIn = 3600): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    })
    return await getSignedUrl(r2Client, command, { expiresIn })
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

      // console.log('🔍 Objetos encontrados en miniatures/:', objects.length)
      // objects.forEach((obj: any) => {
      //   console.log('  - Key:', obj.Key, '| Size:', obj.Size)
      // })

      const backgroundsPromises = objects.map(async (obj: any) => {
        if ((obj.Key as string) === null || (obj.Key as string) === undefined || (obj.Key as string) === '') return null

        // Ignorar carpetas (terminan en / o tienen tamaño 0)
        if ((obj.Key as string).endsWith('/') || obj.Size === 0) {
          // console.log('⏭️  Ignorando carpeta o archivo vacío:', obj.Key)
          return null
        }

        // FIX: Usar storageControllerNew en lugar de this
        const signedUrl = await storageControllerNew.getSignedReadUrl(obj.Key as string)
        // console.log('✅ URL generada para:', obj.Key)
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
    const linkId = req.body?.linkId
    console.log('called')

    if (email === undefined || email === null || email === '') {
      return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
    }

    if (req.file === undefined || req.file === null) {
      return res.status(400).json({ ...constants.API_FAIL_RESPONSE, error: 'No hay shit' })
    }

    try {
      const file = req.file
      const uniqueSuffix = Date.now().toString() + '-' + Math.round(Math.random() * 1E9).toString()
      const extension = typeof file?.originalname === 'string' ? String(file.originalname.split('.').pop() ?? 'jpg') : 'jpg'
      const key = `${email}/images/linkImages/${uniqueSuffix}.${extension}`

      const putCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype
      })

      await r2Client.send(putCommand)

      // Guardar en la base de datos
      try {
        // Guardar la KEY en la base de datos, no la URL firmada
        const resultadoDb = await linkModel.setImagesInDb({ url: key, user: id, id: linkId })

        // Generar URL firmada para la respuesta
        const signedUrl = await storageControllerNew.getSignedReadUrl(key)

        return res.status(200).json({
          ...constants.API_SUCCESS_RESPONSE,
          data: { ...resultadoDb, signedUrl }
        })
      } catch (error) {
        // Si falla guardar en DB, eliminar el archivo de R2
        await r2Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key }))
        console.error(error)
        return res.status(500).json({
          ...constants.API_FAIL_RESPONSE,
          error: 'Error al guardar la imagen en la base de datos'
        })
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
    const linkId = req.body?.linkId
    console.log('🚀 ~ storageControllerNew ~ uploadIcon ~ linkId:', linkId)

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
      // const hasQuota = await checkStorageLimit(userId)
      // if (hasQuota === undefined || hasQuota === null || hasQuota === false) {
      //   return res.status(403).json({ ...constants.API_FAIL_RESPONSE, error: 'Has superado el límite de almacenamiento' })
      // }
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
      const signedUrl = await storageControllerNew.getSignedReadUrl(key)

      try {
        await linkModel.setLinkImgInDb({ url: signedUrl, user: userId, id: linkId })
        return res.status(200).json({
          ...constants.API_SUCCESS_RESPONSE,
          data: {
            url: key,
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

        const signedUrl = await storageControllerNew.getSignedReadUrl(obj.Key as string)
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
      const signedUrl = await storageControllerNew.getSignedReadUrl(key)

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
      const signedUrl = await storageControllerNew.getSignedReadUrl(key)

      return res.status(200).json({ ...constants.API_SUCCESS_RESPONSE, data: signedUrl })
    } catch (error) {
      console.error('Error al obtener la copia de seguridad del usuario:', error)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE, error: 'Error al obtener la copia de seguridad del usuario' })
    }
  }

  static async createUserBackup (req: RequestWithUser, res: Response): Promise<Response> {
    const user = req.user?._id
    const email = req.user?.email

    if (user === undefined || user === null || user === '') {
      return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
    }
    if (email === undefined || email === null || email === '') {
      return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
    }

    try {
      const data1 = await linkModel.getAllLinks({ user })
      const data2 = await categoryModel.getAllCategories({ user })
      // const data3 = await linkModel.getAllLinks({ user: email })

      const backupData = {
        categories: data2,
        links: data1
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
      const signedUrl = await storageControllerNew.getSignedReadUrl(key)

      return res.status(200).json({
        ...constants.API_SUCCESS_RESPONSE,
        data: { url: signedUrl, key }
      })
    } catch (error) {
      const mensaje = 'Error al crear la copia de seguridad'
      console.error('Error al crear la copia de seguridad:', error)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE, error: mensaje })
    }
  }

  static async restoreUserBackup (req: RequestWithUser, res: Response): Promise<void> {
    const email = req.user?.email
    const file = req.file

    if (email === undefined || email === null || email === '') {
      res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: 'Usuario no autenticado' })
      return
    }

    if (file === undefined || file === null) {
      res.status(400).json({ ...constants.API_FAIL_RESPONSE, error: 'No hemos recibido archivo' })
      return
    }

    try {
      const backupData = JSON.parse(file.buffer.toString())

      if (backupData.categories === undefined || backupData.links === undefined) {
        res.status(400).json({ ...constants.API_FAIL_RESPONSE, error: 'El archivo de copia de seguridad no tiene el formato correcto' })
        return
      }

      const result = await userModel.restoreBackup({ email, backupData })

      if ('error' in result) {
        res.status(500).json({ ...constants.API_FAIL_RESPONSE, error: result.error })
        return
      }

      res.status(200).json({
        ...constants.API_SUCCESS_RESPONSE,
        message: 'Copia de seguridad restaurada exitosamente'
      })
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

      const quota = userResult.quota ?? 0
      const newQuota = Number(quota) + Number(difference)

      await userModel.editUser({ email, fields: { quota: newQuota } })

      // Generar URL firmada para la imagen
      const signedUrl = await storageControllerNew.getSignedReadUrl(key)

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

  static async deleteAllUserFiles ({ user }: { user: string }): Promise<{ message: string, filesDeleted: number } | { error: string }> {
    try {
      let filesDeleted = 0
      let continuationToken: string | undefined

      // Iterar con paginación hasta que no haya más objetos
      do {
        const listCommand = new ListObjectsV2Command({
          Bucket: BUCKET_NAME,
          Prefix: `${user}/`,
          MaxKeys: 1000, // Máximo permitido por llamada
          ContinuationToken: continuationToken
        })

        const response = await r2Client.send(listCommand)
        const objects = response.Contents ?? []

        if (objects.length > 0) {
          // Filtrar objetos válidos
          const validObjects = objects.filter((obj: any) =>
            obj.Key !== null && obj.Key !== undefined && obj.Key !== ''
          )

          // Eliminar objetos en paralelo (en lotes de 100 para no saturar)
          const batchSize = 100
          for (let i = 0; i < validObjects.length; i += batchSize) {
            const batch = validObjects.slice(i, i + batchSize)
            const deletePromises = batch.map(async (obj: any) => {
              try {
                const deleteCommand = new DeleteObjectCommand({
                  Bucket: BUCKET_NAME,
                  Key: obj.Key as string
                })
                await r2Client.send(deleteCommand)
                filesDeleted++
              } catch (error) {
                console.error(`Error al eliminar ${String(obj.Key)}:`, error)
              }
            })

            await Promise.all(deletePromises)
          }
        }

        // Verificar si hay más objetos (paginación)
        continuationToken = response.IsTruncated === true ? response.NextContinuationToken : undefined
      } while (continuationToken !== undefined)

      console.log(`✅ Eliminados ${filesDeleted} archivos del usuario ${user}`)
      return { message: 'Todos los archivos del usuario han sido eliminados', filesDeleted }
    } catch (error) {
      console.error('Error al eliminar archivos del usuario:', error)
      return { error: 'Error al eliminar archivos del usuario' }
    }
  }

  /**
   * Nuevo método para generar URLs firmadas para acceso a archivos existentes
   */
  static async getSignedFileUrl (req: RequestWithUser, res: Response): Promise<Response> {
    const email = req.user?.email
    console.log(req.body)

    const { key, expiresIn = 3600, forceDownload = false } = req.body

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

      const signedUrl = await storageControllerNew.getSignedReadUrl(key, expiresIn, forceDownload)

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
  // ...existing code...

  /**
   * Obtener URLs firmadas de las imágenes de un link específico
   */
  static async getLinkImages (req: RequestWithUser, res: Response): Promise<Response> {
    const email = req.user?.email
    const userId = req.user?._id
    const { linkId } = req.params // o req.query según tu ruta

    if (email === undefined || email === null || email === '') {
      return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
    }

    if (linkId === undefined || linkId === null || linkId === '') {
      return res.status(400).json({ ...constants.API_FAIL_RESPONSE, error: 'ID del link requerido' })
    }

    try {
      // Obtener el link de la base de datos
      const linkResult = await linkModel.getLinkById({ user: userId, id: linkId }) as LinkFields

      if ('error' in linkResult) {
        return res.status(404).json({ ...constants.API_FAIL_RESPONSE, error: 'Link no encontrado' })
      }

      // Obtener las keys de las imágenes (guardadas en el campo images del link)
      const imageKeys = linkResult.images ?? []

      if (imageKeys.length === 0) {
        return res.status(200).json({
          ...constants.API_SUCCESS_RESPONSE,
          data: []
        })
      }

      // Generar URLs firmadas para cada imagen
      const signedImagesPromises = imageKeys.map(async (key: string) => {
        try {
          // Verificar que la key pertenece al usuario
          if (!key.startsWith(`${email}/`)) {
            console.warn(`Imagen ${key} no pertenece al usuario ${email}`)
            return null
          }

          // Generar URL firmada
          const signedUrl = await storageControllerNew.getSignedReadUrl(key, 3600) // 1 hora de expiración

          return {
            key,
            url: signedUrl,
            fileName: key.split('/').pop() ?? key
          }
        } catch (error) {
          console.error(`Error al generar URL firmada para ${key}:`, error)
          return null
        }
      })

      const signedImages = (await Promise.all(signedImagesPromises)).filter(Boolean)

      return res.status(200).json({
        ...constants.API_SUCCESS_RESPONSE,
        data: signedImages
      })
    } catch (error) {
      console.error('Error al obtener las imágenes del link:', error)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE, error: 'Error al obtener las imágenes del link' })
    }
  }

  /**
   * Obtener URLs firmadas para múltiples links (bulk operation)
   * Útil cuando cargas varios links a la vez
   */
  static async getBulkLinkImages (req: RequestWithUser, res: Response): Promise<Response> {
    const email = req.user?.email
    const userId = req.user?._id
    const { linkIds } = req.body // Array de IDs de links

    if (email === undefined || email === null || email === '') {
      return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
    }

    if (!Array.isArray(linkIds) || linkIds.length === 0) {
      return res.status(400).json({ ...constants.API_FAIL_RESPONSE, error: 'Array de IDs de links requerido' })
    }

    try {
      const linksImagesPromises = linkIds.map(async (linkId: string) => {
        try {
          const linkResult = await linkModel.getLinkById({ user: userId, id: linkId }) as LinkFields

          if ('error' in linkResult) {
            return { linkId, images: [] }
          }

          const imageKeys = linkResult.images ?? []

          const signedImagesPromises = imageKeys.map(async (key: string) => {
            try {
              if (!key.startsWith(`${email}/`)) {
                return null
              }

              const signedUrl = await storageControllerNew.getSignedReadUrl(key, 3600)

              return {
                key,
                url: signedUrl,
                fileName: key.split('/').pop() ?? key
              }
            } catch (error) {
              console.error(`Error al generar URL firmada para ${key}:`, error)
              return null
            }
          })

          const signedImages = (await Promise.all(signedImagesPromises)).filter(Boolean)

          return {
            linkId,
            images: signedImages
          }
        } catch (error) {
          console.error(`Error al procesar link ${linkId}:`, error)
          return { linkId, images: [] }
        }
      })

      const linksImages = await Promise.all(linksImagesPromises)

      return res.status(200).json({
        ...constants.API_SUCCESS_RESPONSE,
        data: linksImages
      })
    } catch (error) {
      console.error('Error al obtener las imágenes de los links:', error)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE, error: 'Error al obtener las imágenes de los links' })
    }
  }

  /**
   * Importar marcadores desde un archivo HTML de Chrome
   * Esta función parsea el HTML de marcadores de Chrome y crea las categorías y enlaces correspondientes
   */
  static async importChromeBookmarks (req: RequestWithUser, res: Response): Promise<Response> {
    const email = req.user?.email
    const userId = req.user?._id
    const file = req.file

    if (email === undefined || email === null || email === '' || userId === undefined || userId === null || userId === '') {
      return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
    }

    if (file === undefined || file === null) {
      return res.status(400).json({ ...constants.API_FAIL_RESPONSE, error: 'No se proporcionó archivo HTML de marcadores' })
    }

    try {
      // Leer el contenido del archivo HTML
      const htmlContent = file.buffer.toString('utf-8')

      // Helper para generar slug único
      const generateSlug = (name: string, parentSlug?: string): string => {
        const baseSlug = name.toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')

        return parentSlug !== undefined && parentSlug !== null && parentSlug !== '' ? `${parentSlug}-${baseSlug}` : baseSlug
      }

      // Helper para generar URL de favicon de Google
      const generateGoogleFaviconUrl = (url: string): string => {
        try {
          const domain = new URL(url).origin
          return `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(domain)}&size=64`
        } catch (error) {
          console.error('Error al generar URL de favicon:', error)
          return ''
        }
      }

      // Parsear el HTML - Mejorado para manejar la estructura correctamente
      interface BookmarkNode {
        type: 'folder' | 'link'
        name: string
        url?: string
        icon?: string
        addDate?: string
        children?: BookmarkNode[]
      }

      const parseBookmarksHTML = (html: string): BookmarkNode[] => {
        const rootNodes: BookmarkNode[] = []
        const stack: BookmarkNode[] = []

        // Limpiar el HTML y dividir por líneas
        const lines = html.split('\n')

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim()

          // Detectar carpetas (H3)
          if (line.includes('<H3')) {
            const nameMatch = line.match(/<H3[^>]*>([^<]+)<\/H3>/)
            if (nameMatch != null) {
              const folder: BookmarkNode = {
                type: 'folder',
                name: nameMatch[1].trim(),
                children: []
              }

              // Agregar a la estructura
              if (stack.length === 0) {
                rootNodes.push(folder)
              } else {
                const parent = stack[stack.length - 1]
                if (parent.children != null) {
                  parent.children.push(folder)
                }
              }

              // Agregar al stack para futuros hijos
              stack.push(folder)
            }
          } else if (line.includes('<A ')) {
            // Detectar enlaces (A)
            // Regex mejorado para capturar todos los atributos
            const linkMatch = line.match(/<A\s+HREF="([^"]+)"(?:\s+ADD_DATE="(\d+)")?(?:\s+ICON="([^"]+)")?>([^<]+)<\/A>/i)
            if (linkMatch != null) {
              const link: BookmarkNode = {
                type: 'link',
                name: linkMatch[4].trim(),
                url: linkMatch[1],
                addDate: linkMatch[2],
                icon: linkMatch[3]
              }

              // Agregar al contenedor actual
              if (stack.length === 0) {
                rootNodes.push(link)
              } else {
                const parent = stack[stack.length - 1]
                if (parent.children != null) {
                  parent.children.push(link)
                }
              }
            }
          } else if (line.includes('</DL>')) {
            // Detectar cierre de lista (</DL>) - salir del nivel actual
            if (stack.length > 0) {
              stack.pop()
            }
          }
        }

        return rootNodes
      }

      const bookmarkTree = parseBookmarksHTML(htmlContent)

      // Estadísticas de importación
      let categoriesCreated = 0
      let linksCreated = 0
      let errors = 0

      // Map para guardar IDs de categorías creadas por slug
      const categoryMap = new Map<string, string>()

      // Función recursiva para procesar el árbol de marcadores
      const processBookmarkNode = async (node: BookmarkNode, parentId?: string, parentSlug?: string, level: number = 0): Promise<void> => {
        try {
          if (node.type === 'folder') {
            // Crear categoría
            const slug = generateSlug(node.name, parentSlug)

            // Verificar si la categoría ya existe
            let categoryId = categoryMap.get(slug)

            if (categoryId === undefined || categoryId === null || categoryId === '') {
              // Obtener el orden de la última categoría
              const categories = await categoryModel.getAllCategories({ user: userId })
              const order = Array.isArray(categories) ? categories.length : 0

              const categoryData = {
                user: userId,
                fields: {
                  name: node.name,
                  slug,
                  parentId: (parentId !== undefined && parentId !== null && parentId !== '') ? parentId : undefined,
                  parentSlug: (parentSlug !== undefined && parentSlug !== null && parentSlug !== '') ? parentSlug : undefined,
                  level,
                  order,
                  isEmpty: false,
                  hidden: false,
                  displayName: node.name
                }
              }

              const result = await categoryModel.createCategory(categoryData)

              if ('error' in result) {
                console.error(`Error al crear categoría ${node.name}:`, result.error)
                errors++
                return
              }

              // El resultado es un array, tomamos el primer elemento
              categoryId = Array.isArray(result) && result.length > 0 ? (result[0] as any)._id?.toString() : undefined
              if (categoryId !== undefined && categoryId !== null && categoryId !== '') {
                categoryMap.set(slug, categoryId)
                categoriesCreated++
              }
            }

            // Procesar hijos recursivamente
            if ((node.children != null) && Array.isArray(node.children) && node.children.length > 0) {
              for (const child of node.children) {
                await processBookmarkNode(child, categoryId, slug, level + 1)
              }
            }
          } else if (node.type === 'link') {
            // Crear enlace
            if (parentId === undefined || parentId === null || parentId === '') {
              console.warn(`Enlace sin categoría padre: ${node.name}`)
              errors++
              return
            }

            // Generar URL de favicon usando Google Favicons
            let imgUrl: string | undefined
            try {
              if (node.url !== undefined && node.url !== null && node.url !== '') {
                imgUrl = generateGoogleFaviconUrl(node.url)
              }
            } catch (error) {
              console.error(`Error al generar favicon URL para ${node.name}:`, error)
            }

            // Obtener el orden del último link en la categoría
            const links = await linkModel.getLinksByTopCategoryId({ user: userId, id: parentId })
            const order = Array.isArray(links) ? links.length : 0

            const linkData: ValidatedLinkData = {
              name: node.name,
              url: node.url ?? '',
              categoryId: parentId,
              imgUrl,
              type: 'general' as const,
              order,
              bookmark: false,
              readlist: false,
              description: (node.addDate !== undefined && node.addDate !== null && node.addDate !== '')
                ? `Importado desde Chrome - ${new Date(parseInt(node.addDate) * 1000).toLocaleDateString()}`
                : 'Importado desde Chrome',
              user: userId
            }

            const result = await linkModel.createLink({ cleanData: linkData })

            if ('error' in result) {
              console.error(`Error al crear enlace ${node.name}:`, result.error)
              errors++
              return
            }

            linksCreated++
          }
        } catch (error) {
          console.error(`Error al procesar nodo ${node.name}:`, error)
          errors++
        }
      }

      // Procesar todo el árbol
      for (const node of bookmarkTree) {
        await processBookmarkNode(node, undefined, undefined, 0)
      }

      return res.status(200).json({
        ...constants.API_SUCCESS_RESPONSE,
        message: 'Marcadores importados exitosamente',
        data: {
          categoriesCreated,
          linksCreated,
          errors,
          summary: `Se crearon ${categoriesCreated} categorías y ${linksCreated} enlaces${errors > 0 ? ` con ${errors} errores` : ''}`
        }
      })
    } catch (error) {
      console.error('Error al importar marcadores:', error)
      return res.status(500).json({
        ...constants.API_FAIL_RESPONSE,
        error: 'Error al importar marcadores de Chrome'
      })
    }
  }
}
