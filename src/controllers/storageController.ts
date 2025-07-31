import { deleteObject, getDownloadURL, getMetadata, listAll, ref, uploadBytes } from 'firebase/storage'
import { Response } from 'express'
import { RequestWithUser } from '../types/express'
import { linkModel } from '../models/linkModel'
import { userModel } from '../models/userModel'
import { firebaseStorage as storage } from '../config/firebase'

// const firebaseConfig = {
//   apiKey: process.env.FB_API_KEY,
//   authDomain: process.env.FB_AUTH_DOMAIN,
//   projectId: process.env.FB_PROJECT_ID,
//   storageBucket: process.env.FB_STORAGE_BUCKET,
//   messagingSenderId: process.env.FB_MESSAGING_ID,
//   appId: process.env.FB_APP_ID
// }

// const app = initializeApp(firebaseConfig)
// Ensure firebaseApp is initialized and is of type FirebaseApp
// const storage = firebaseStorage

/* eslint-disable @typescript-eslint/no-extraneous-class */
export class storageController {
  static async getBackgroundsMiniatures (req: RequestWithUser, res: Response): Promise<void> {
    // const user = req.user.name
    try {
      const fileRef = ref(storage, 'miniatures')
      const list = await listAll(fileRef)
      const { items } = list
      items.forEach((item) => {
        getMetadata(item).then(metadata => console.log(metadata)).catch(console.error)
      })
      const backgroundsPromises = items.map(async (back) => ({
        url: await getDownloadURL(back),
        nombre: (await getMetadata(back)).name
      }))

      const backgrounds = await Promise.all(backgroundsPromises)
      res.send({ backgrounds })
    } catch (err) {
      console.error('Error al leer la carpeta:', err)
      res.send(err)
    }
  }

  // Validar?
  static async uploadImage (req: RequestWithUser, res: Response): Promise<void> {
    const user = req.user?.name
    if (user === undefined || user === null || user === '') {
      res.status(401).json({ status: 'fail', message: 'Usuario no autenticado' })
      return
    }
    const file = req.file
    const linkId = req.body.linkId
    // Si no hay imagen error
    if (req.file === undefined || req.file === null) {
      res.send({ error: 'No hemos recibido imagen' })
      return
    }
    try {
      // El lugar donde quieres guardar el archivo
      const imagesRef = ref(storage, `${user}/images/linkImages`)
      const uniqueSuffix = Date.now().toString() + '-' + Math.round(Math.random() * 1E9).toString()
      const extension = typeof file?.originalname === 'string' ? String(file.originalname.split('.').pop() ?? 'jpg') : 'jpg'

      // El lugar y el nombre donde se guardará el archivo
      const imageRef = ref(imagesRef, `${uniqueSuffix}.${extension}`)
      if (file === undefined || file === null) {
        res.status(400).send({ error: 'No hemos recibido imagen' })
        return
      }
      const snapshot = await uploadBytes(imageRef, file.buffer)
      const downloadURL = await getDownloadURL(snapshot.ref)
      try {
        const resultadoDb = await linkModel.setImagesInDb({ url: downloadURL, user, linkId })
        res.send({ status: 'success', link: resultadoDb })
      } catch (error) {
        res.send(error)
      }
    } catch (error) {
      console.error('Error al subir el archivo:', error)
      res.status(500).send({ error: 'Error al subir el archivo' })
    }
  }
  // borrar por nombre -> revisar resto

  static async deleteImage (req: RequestWithUser, res: Response): Promise<void> {
    const user = req.user?.name
    const linkId = req.body.id
    const imageUrl = req.body.image

    if (user === undefined || user === null || user === '') {
      res.status(401).json({ status: 'fail', message: 'Usuario no autenticado' })
      return
    }

    // Validar con zod?
    if (imageUrl === undefined || imageUrl === null || imageUrl === '') {
      res.send({ error: 'No hemor recibido la imagen en la petición' })
      return
    }
    try {
      // Construye la referencia a la imagen en Storage
      const imageRef = ref(storage, imageUrl)
      if (imageRef === null || imageRef === undefined) {
        res.send({ error: 'No se encontró la imagen para eliminar' })
        return
      }
      const { size } = await getMetadata(imageRef)
      console.log('🚀 ~ storageController ~ deleteImage ~ size:', size)
      // Borra el archivo
      await deleteObject(imageRef)
      try {
        // Restar el tamaño de la imagen al usuario
        const userResult = await userModel.getUser({ email: user })
        if ('error' in userResult) {
          res.send({ error: 'Usuario no encontrado' })
          return
        }
        const quota = (userResult as any).quota
        const newQuota = quota - size
        console.log('🚀 ~ storageController ~ deleteImage ~ newQuota:', newQuota)
        await userModel.editUser({ email: user, user: { quota: newQuota } })

        // Borrar la referencia de la imagen en base de datos
        await linkModel.deleteImageOnDb({ url: imageUrl, user, linkId })
        res.send({ message: 'Imagen eliminada exitosamente' }) // Mensaje success, etc. ver en cliente
      } catch (error) {
        res.send({ error })
      }
    } catch (error: unknown) {
      // console.error('Error al eliminar la imagen:', error)
      // if (error.code === 'storage/invalid-url' || error.code === 'storage/object-not-found') {
      //   await linkModel.deleteImageOnDb(imageUrl, user, linkId) // Ojo esto esta por error
      // }
      const errorCode = error != null && typeof error === 'object' && 'code' in error ? (error as any).code : 'unknown'
      res.status(500).send({ error: errorCode })
    }
  }

  static async uploadIcon (req: RequestWithUser, res: Response): Promise<void> {
    const file = req.file
    const user = req.user?.name
    const linkId = req.body.linkId

    if (user === undefined || user === null || user === '') {
      res.status(401).json({ status: 'fail', message: 'Usuario no autenticado' })
      return
    }

    // Si no hay imagen ha elegido una de muestra
    if (file === undefined || file === null) {
      try {
        const filePath = req.body.filePath
        const resultadoDb = await linkModel.setLinkImgInDb({ url: filePath, user, linkId })
        res.send(resultadoDb)
      } catch (error) {
        res.send(error)
      }
      return
    }
    // Limitar tamaño en el cliente validar aqui
    try {
      const imagesRef = ref(storage, `${user}/images/icons`)
      const uniqueSuffix = Date.now().toString() + '-' + Math.round(Math.random() * 1E9).toString()
      const extension = (file.originalname.split('.').pop() ?? 'jpg') as string
      const imageRef = ref(imagesRef, `${uniqueSuffix}.${extension}`)
      const snapshot = await uploadBytes(imageRef, file.buffer)
      const downloadURL = await getDownloadURL(snapshot.ref)
      try {
        await linkModel.setLinkImgInDb({ url: downloadURL, user, linkId })
        res.send({ message: '¡Archivo o blob subido!', url: downloadURL, name: `${uniqueSuffix}.${extension}` })
      } catch (error) {
        res.send(error)
      }
    } catch (error) {
      console.error('Error al subir el archivo:', error)
      res.status(500).send({ error: 'Error al subir el archivo' })
    }
  }

  static async deleteIcon (req: RequestWithUser, res: Response): Promise<void> {
    const user = req.user?.name
    if (user === undefined || user === null || user === '') {
      res.status(401).send('Error usuario no proporcionado')
      return
    }

    const imageName = String(req.body.image)
    console.log('🚀 ~ storageController ~ deleteIcon ~ imageUrl:', imageName)
    try {
      // Construye la referencia a la imagen en Storage
      const imageRef = ref(storage, `${user}/images/icons/${imageName}`)
      const { size } = await getMetadata(imageRef)
      console.log('🚀 ~ storageController ~ deleteIcon ~ size:', size)

      const userResult = await userModel.getUser({ email: user })
      if ('error' in userResult) {
        res.send({ error: 'Usuario no encontrado' })
        return
      }
      const quota = (userResult as any).quota
      const newQuota = quota - size
      console.log('🚀 ~ storageController ~ deleteIcon ~ newQuota:', newQuota)
      await userModel.editUser({ email: user, user: { quota: newQuota } })
      // Borra el archivo en firebase
      await deleteObject(imageRef)
      res.send({ message: 'Imagen eliminada exitosamente' })
    } catch (error: unknown) {
      const errorCode = error != null && typeof error === 'object' && 'code' in error ? (error as any).code : 'unknown'
      res.status(500).send({ error: errorCode })
    }
  }

  static async getLinkIcons (req: RequestWithUser, res: Response): Promise<void> {
    const user = req.user?.name

    if (user === undefined || user === null || user === '') {
      res.status(401).json({ status: 'fail', message: 'Usuario no autenticado' })
      return
    }

    // De la carpeta 'SergioSR/images/icons' tira toda la app
    // esto es facil de cambiar
    try {
      const defaultIconsRef = ref(storage, 'SergioSR/images/icons')
      const defaultList = await listAll(defaultIconsRef)
      const { items } = defaultList
      const defaultIconsPromises = items.map(async (back) => ({
        url: await getDownloadURL(back),
        nombre: (await getMetadata(back)).name,
        clase: 'default'
      }))
      const icons = await Promise.all(defaultIconsPromises)

      const userIconsList = await listAll(ref(storage, `${user}/images/icons`))
      const userIconsPromises = userIconsList.items.map(async (back) => ({
        url: await getDownloadURL(back),
        nombre: (await getMetadata(back)).name,
        clase: 'user'
      }))
      const userIcons = await Promise.all(userIconsPromises)
      icons.push(...userIcons)

      res.send(icons)
    } catch (err) {
      console.error('Error al leer la carpeta:', err)
      res.send(err)
    }
  }

  static async getBackgroundUrl (req: RequestWithUser, res: Response): Promise<void> {
    // const user = req.user.name
    const nombre = String(req.query.nombre ?? '')
    try {
      const fileRef = ref(storage, `/backgrounds/${nombre}`)
      const downloadUrl = await getDownloadURL(fileRef)
      console.log('Me han llamado')
      res.send(downloadUrl)
    } catch (error) {
      res.send(error)
    }
  }

  static async getUserBackup (req: RequestWithUser, res: Response): Promise<void> {
    const user = req.user?.name

    if (user === undefined || user === null || user === '') {
      res.status(401).json({ status: 'fail', message: 'Usuario no autenticado' })
      return
    }

    const fileName = `${user}dataBackup.json`
    const fileRef = ref(storage, `${user}/backups/${fileName}`)
    const downloadUrl = await getDownloadURL(fileRef)
    console.log(downloadUrl)

    res.send({ downloadUrl })
  }

  // TODO: Este método necesita desktopModel y columnModel que no están disponibles
  static async createUserBackup (req: RequestWithUser, res: Response): Promise<void> {
    const user = req.user?.name

    if (user === undefined || user === null || user === '') {
      res.status(401).json({ status: 'fail', message: 'Usuario no autenticado' })
      return
    }

    try {
      // Comentado hasta que estén disponibles los modelos necesarios
      res.status(501).send({ error: 'Funcionalidad no implementada - faltan modelos desktopModel y columnModel' })
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
      res.send({ mensaje })
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

  static async uploadProfileImage (req: RequestWithUser, res: Response): Promise<void> {
    const user = req.user?.name

    if (user === undefined || user === null || user === '') {
      res.status(401).json({ status: 'fail', message: 'Usuario no autenticado' })
      return
    }
    if (req.file === undefined || req.file === null) {
      res.status(400).send({ error: 'No se proporcionó ningún archivo' })
      return
    }

    const file = req.file

    try {
      // Cambiar loop por seleccionar la única que debe haber, el loop puede venir bien al borrar la cuenta de usuario
      // Calcular el tamaño y calcular nueva cuota
      const imagesRef = ref(storage, `${user}/images/profile`)
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
      const extension = (file.originalname.split('.').pop() ?? 'jpg') as string
      const imageRef = ref(imagesRef, `${uniqueSuffix}.${extension}`)
      const snapshot = await uploadBytes(imageRef, file.buffer)
      const newSize = snapshot.metadata.size
      const diference = Number(newSize) - Number(prevImageSize)

      const userResult = await userModel.getUser({ email: user })
      if ('error' in userResult) {
        res.send({ error: 'Usuario no encontrado' })
        return
      }
      const quota = (userResult as any).quota

      if (quota === undefined) {
        const newQuota = Number(newSize)
        if (newQuota > Number(process.env.MAX_USER_QUOTA)) {
          res.send({ error: 'No tienes espacio suficiente' })
          return
        }
        await userModel.editUser({ email: user, user: { quota: newQuota } })
        console.log('🚀 ~ storageController ~ uploadProfileImage ~ quota:', quota)
      } else {
        const newQuota = Number(quota) + Number(diference)
        if (newQuota > Number(process.env.MAX_USER_QUOTA)) {
          res.send({ error: 'No tienes espacio suficiente' })
          return
        }
        console.log('🚀 ~ storageController ~ uploadProfileImage ~ newQuota:', newQuota)
        await userModel.editUser({ email: user, user: { quota: newQuota } })
      }
      const downloadURL = await getDownloadURL(snapshot.ref)
      try {
        await userModel.updateProfileImage({ url: downloadURL, user })
        res.send({ message: '¡Archivo o blob subido!', url: downloadURL })
      } catch (error) {
        res.send(error)
      }
    } catch (error) {
      console.error('Error al subir el archivo:', error)
      res.status(500).send({ error: 'Error al subir el archivo' })
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
