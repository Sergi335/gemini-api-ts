import { Response } from 'express'
import { deleteObject, getDownloadURL, getMetadata, listAll, ref, uploadBytes } from 'firebase/storage'
import { firebaseStorage as storage } from '../config/firebase'
import { linkModel } from '../models/linkModel'
import { userModel } from '../models/userModel'
import { RequestWithUser } from '../types/express'
import { constants } from '../utils/constants'

/* eslint-disable @typescript-eslint/no-extraneous-class */
export class storageController {
  static async getBackgroundsMiniatures (req: RequestWithUser, res: Response): Promise<Response> {
    // const user = req.user.name
    try {
      const user = req.user?._id
      if (user === undefined || user === null || user === '') {
        return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
      }
      const fileRef = ref(storage, 'miniatures')
      const list = await listAll(fileRef)
      const { items } = list
      // Añadir función para subir backgrounds y buscar también en la carpeta del usuario
      const backgroundsPromises = items.map(async (back) => ({
        url: await getDownloadURL(back),
        nombre: (await getMetadata(back)).name
      }))

      const backgrounds = await Promise.all(backgroundsPromises)
      return res.status(200).json({ ...constants.API_SUCCESS_RESPONSE, data: backgrounds })
    } catch (err) {
      console.error('Error al leer la carpeta:', err)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE })
    }
  }

  // Validar?
  static async uploadImage (req: RequestWithUser, res: Response): Promise<Response> {
    const email = req.user?.email
    const id = req.user?._id
    console.log('🚀 ~ storageController ~ uploadImage ~ user:', email)
    const linkId = req.body.linkId

    if (email === undefined || email === null || email === '') {
      return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
    }

    if (req.file === undefined || req.file === null) {
      return res.status(400).json({ ...constants.API_FAIL_RESPONSE, error: 'No hemos recibido imagen' })
    }
    try {
      // El lugar donde quieres guardar el archivo
      const file = req.file
      const imagesRef = ref(storage, `${email}/images/linkImages`)
      const uniqueSuffix = Date.now().toString() + '-' + Math.round(Math.random() * 1E9).toString()
      const extension = typeof file?.originalname === 'string' ? String(file.originalname.split('.').pop() ?? 'jpg') : 'jpg'

      // El lugar y el nombre donde se guardará el archivo
      const imageRef = ref(imagesRef, `${uniqueSuffix}.${extension}`)
      const snapshot = await uploadBytes(imageRef, file.buffer)
      const downloadURL = await getDownloadURL(snapshot.ref)
      try {
        const resultadoDb = await linkModel.setImagesInDb({ url: downloadURL, user: id, id: linkId })
        return res.status(200).json({ ...constants.API_SUCCESS_RESPONSE, data: resultadoDb })
      } catch (error) {
        return res.status(500).json({ ...constants.API_FAIL_RESPONSE, error: 'Error al guardar la imagen en la base de datos' })
      }
    } catch (error) {
      console.error('Error al subir el archivo:', error)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE, error: 'Error al subir el archivo' })
    }
  }
  // borrar por nombre -> revisar resto

  static async deleteImage (req: RequestWithUser, res: Response): Promise<Response> {
    const email = req.user?.email
    const id = req.user?._id
    const linkId = req.body.id
    const imageUrl = req.body.image

    if (email === undefined || email === null || email === '') {
      return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
    }

    // Validar con zod?
    if (imageUrl === undefined || imageUrl === null || imageUrl === '') {
      return res.status(400).json({ ...constants.API_FAIL_RESPONSE, error: 'No hemos recibido la imagen en la petición' })
    }
    try {
      // Construye la referencia a la imagen en Storage
      const imageRef = ref(storage, imageUrl)
      if (imageRef === null || imageRef === undefined) {
        return res.status(404).json({ ...constants.API_FAIL_RESPONSE, error: 'No se encontró la imagen para eliminar' })
      }
      const { size } = await getMetadata(imageRef)
      console.log('🚀 ~ storageController ~ deleteImage ~ size:', size)
      // Borra el archivo
      await deleteObject(imageRef)
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
        console.log('🚀 ~ storageController ~ deleteImage ~ newQuota:', newQuota)
        await userModel.editUser({ email, fields: { quota: newQuota } })

        // Borrar la referencia de la imagen en base de datos
        await linkModel.deleteImageOnDb({ url: imageUrl, user: id, id: linkId }) // No borra el registro en la db
        return res.status(200).json({ ...constants.API_SUCCESS_RESPONSE, message: 'Imagen eliminada exitosamente' })
      } catch (error) {
        console.error('Error al eliminar la imagen de la base de datos:', error)
        return res.status(500).json({ ...constants.API_FAIL_RESPONSE, error: 'Error al eliminar la imagen de la base de datos' })
      }
    } catch (error) {
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE, error: 'Error al eliminar la imagen de la base de datos' })
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

    // Si no hay imagen ha elegido una de muestra
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
    // Limitar tamaño en el cliente validar aqui
    try {
      const imagesRef = ref(storage, `${user}/images/icons`)
      const uniqueSuffix = Date.now().toString() + '-' + Math.round(Math.random() * 1E9).toString()
      const extension = (file.originalname.split('.').pop() ?? 'jpg')
      const imageRef = ref(imagesRef, `${uniqueSuffix}.${extension}`)
      const snapshot = await uploadBytes(imageRef, file.buffer)
      const downloadURL = await getDownloadURL(snapshot.ref)
      try {
        await linkModel.setLinkImgInDb({ url: downloadURL, user: userId, id: linkId })
        return res.status(200).json({ ...constants.API_SUCCESS_RESPONSE, data: { url: downloadURL, name: `${uniqueSuffix}.${extension}` } })
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
    console.log('🚀 ~ storageController ~ deleteIcon ~ imageUrl:', imageName)
    try {
      // Construye la referencia a la imagen en Storage
      const imageRef = ref(storage, `${email}/images/icons/${imageName}`)
      const { size } = await getMetadata(imageRef)
      console.log('🚀 ~ storageController ~ deleteIcon ~ size:', size)

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
      console.log('🚀 ~ storageController ~ deleteIcon ~ newQuota:', newQuota)
      await userModel.editUser({ email, fields: { quota: newQuota } })
      // Borra el archivo en firebase
      await deleteObject(imageRef)
      return res.status(200).json({ ...constants.API_SUCCESS_RESPONSE, message: 'Imagen eliminada exitosamente' })
    } catch (error) {
      console.error('Error al eliminar la imagen:', error)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE, error: 'Error al eliminar la imagen' })
    }
  }

  static async getLinkIcons (req: RequestWithUser, res: Response): Promise<Response> {
    // const user = req.user?._id
    const email = req.user?.email

    if (email === undefined || email === null || email === '') {
      return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
    }

    // De la carpeta 'SergioSR/images/icons' tira toda la app
    // esto es facil de cambiar
    try {
      // const defaultIconsRef = ref(storage, 'SergioSR/images/icons')
      // const defaultList = await listAll(defaultIconsRef)
      // const { items } = defaultList
      // const defaultIconsPromises = items.map(async (back) => ({
      //   url: await getDownloadURL(back),
      //   nombre: (await getMetadata(back)).name,
      //   clase: 'default'
      // }))
      // const icons = await Promise.all(defaultIconsPromises)

      const userIconsList = await listAll(ref(storage, `${email}/images/icons`))
      const userIconsPromises = userIconsList.items.map(async (back) => ({
        url: await getDownloadURL(back),
        nombre: (await getMetadata(back)).name,
        clase: 'user'
      }))
      const userIcons = await Promise.all(userIconsPromises)
      // icons.push(...userIcons)

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
      const fileRef = ref(storage, `/backgrounds/${nombre}`)
      const downloadUrl = await getDownloadURL(fileRef)
      console.log('Me han llamado')
      return res.status(200).json({ ...constants.API_SUCCESS_RESPONSE, data: downloadUrl })
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
      const fileRef = ref(storage, `${email}/backups/${fileName}`)
      const downloadUrl = await getDownloadURL(fileRef)
      console.log(downloadUrl)

      return res.status(200).json({ ...constants.API_SUCCESS_RESPONSE, data: downloadUrl })
    } catch (error) {
      console.error('Error al obtener la copia de seguridad del usuario:', error)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE, error: 'Error al obtener la copia de seguridad del usuario' })
    }
  }

  // TODO: Este método necesita desktopModel y columnModel que no están disponibles
  static async createUserBackup (req: RequestWithUser, res: Response): Promise<Response> {
    const email = req.user?.email

    if (email === undefined || email === null || email === '') {
      return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
    }

    try {
      // Comentado hasta que estén disponibles los modelos necesarios
      return res.status(501).send({ error: 'Funcionalidad no implementada - faltan modelos desktopModel y columnModel' })
      /*
      const data1 = await desktopModel.getAllDesktops({ user })
      const data2 = await columnModel.getAllColumns({ user })
      const data3 = await linkModel.getAllLinks({ user })

      const backupData = {
        escritorios: data1,
        columnas: data2,
        links: data3
      }
      */
    } catch (error) {
      const mensaje = 'Error al crear la copia de seguridad'
      console.error('Error al crear la copia de seguridad:', error)
      return res.send({ mensaje })
    }
  }

  // TODO: Este método necesita esquemas que no están disponibles
  static async restoreUserBackup (req: RequestWithUser, res: Response): Promise<void> {
    const user = req.user?.name
    const file = req.file

    if (user === undefined || user === null || user === '') {
      res.status(401).json({ status: 'fail', message: 'Usuario no autenticado' })
      return
    }

    if (file === undefined || file === null) {
      res.send({ error: 'No hemos recibido archivo' })
      return
    }

    console.log(file)
    try {
      // Comentado hasta que estén disponibles los esquemas necesarios
      res.status(501).send({ error: 'Funcionalidad no implementada - faltan esquemas escritorio y columna' })
      /*
      const buffer = req.file.buffer
      const str = buffer.toString()
      const data = JSON.parse(str)
      console.log(data)

      const { escritorios, columnas, links } = data

      await escritorio.deleteMany({ user })
      await columna.deleteMany({ user })
      await link.deleteMany({ user })
      */
    } catch (error) {
      const mensaje = 'Error al restaurar la copia de seguridad'
      console.error('Error al restaurar la copia de seguridad:', error)
      res.send({ mensaje })
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
      // Cambiar loop por seleccionar la única que debe haber, el loop puede venir bien al borrar la cuenta de usuario
      // Calcular el tamaño y calcular nueva cuota
      const imagesRef = ref(storage, `${email}/images/profile`)
      const list = await listAll(imagesRef)
      const { items } = list
      let prevImageSize = 0
      if (items.length > 0) {
        // items.forEach(async (item) => {
        //   await deleteObject(item)
        // })
        prevImageSize = (await getMetadata(items[0])).size
        console.log('🚀 ~ storageController ~ uploadProfileImage ~ prevImageSize:', prevImageSize)
        await deleteObject(items[0])
      }
      const uniqueSuffix = Date.now().toString() + '-' + Math.round(Math.random() * 1E9).toString()
      const extension = (file.originalname.split('.').pop() ?? 'jpg')
      const imageRef = ref(imagesRef, `${uniqueSuffix}.${extension}`)
      const snapshot = await uploadBytes(imageRef, file.buffer)
      const newSize = snapshot.metadata.size
      const diference = Number(newSize) - Number(prevImageSize)

      const userResult = await userModel.getUser({ email })
      if ('error' in userResult) {
        return res.json({ ...constants.API_FAIL_RESPONSE, error: 'Usuario no encontrado' })
      }
      const quota = userResult.quota ?? 0
      const newQuota = Number(quota) + Number(diference)

      await userModel.editUser({ email, fields: { quota: newQuota } })
      const downloadURL = await getDownloadURL(snapshot.ref)
      try {
        await userModel.updateProfileImage({ profileImage: downloadURL, email })
        return res.json({ ...constants.API_SUCCESS_RESPONSE, message: '¡Archivo o blob subido!', data: { url: downloadURL } })
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
      const imagesRef = ref(storage, `${user}/images/profile`)
      const list = await listAll(imagesRef)
      const { items } = list

      if (items.length > 0) {
        await Promise.all(items.map(async (item) => {
          await deleteObject(item)
        }))
      }
      const backupRef = ref(storage, `${user}/backups`)
      const backupList = await listAll(backupRef)
      const { items: backupItems } = backupList
      if (backupItems.length > 0) {
        await Promise.all(backupItems.map(async (item) => {
          await deleteObject(item)
        }))
      }
      const iconsRef = ref(storage, `${user}/images/icons`)
      const iconsList = await listAll(iconsRef)
      const { items: iconsItems } = iconsList
      if (iconsItems.length > 0) {
        await Promise.all(iconsItems.map(async (item) => {
          await deleteObject(item)
        }))
      }
      const linkImages = ref(storage, `${user}/images/linkImages`)
      const imagesList = await listAll(linkImages)
      const { items: imagesItems } = imagesList
      if (imagesItems.length > 0) {
        await Promise.all(imagesItems.map(async (item) => {
          await deleteObject(item)
        }))
      }
      const userRef = ref(storage, `${user}`)
      const userFilesList = await listAll(userRef)
      const { items: userFilesItems } = userFilesList
      if (userFilesItems.length > 0) {
        await Promise.all(userFilesItems.map(async (item) => {
          await deleteObject(item)
        }))
      }
      return ({ message: 'Todos los archivos del usuario han sido eliminados' })
    } catch (error) {
      return (error)
    }
  }
}
