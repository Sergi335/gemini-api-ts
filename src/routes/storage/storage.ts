import express from 'express'
import multer from 'multer'
import { storageController } from '../../controllers/storageController'
import limitStorage from '../../middlewares/limitStorage'
const upload = multer()

export const storageRouter = express.Router()

storageRouter.get('/backgrounds', storageController.getBackgroundsMiniatures)
storageRouter.get('/backgroundurl', storageController.getBackgroundUrl)
storageRouter.get('/icons', storageController.getLinkIcons)
storageRouter.get('/backup', storageController.getUserBackup)

storageRouter.post('/backup', storageController.createUserBackup)
storageRouter.post('/restorebackup', upload.single('backup'), storageController.restoreUserBackup)
storageRouter.post('/image', upload.single('images'), limitStorage, storageController.uploadImage)
storageRouter.post('/icon', upload.single('linkImg'), limitStorage, storageController.uploadIcon)
storageRouter.post('/profilepic', upload.single('file'), limitStorage, storageController.uploadProfileImage)
storageRouter.delete('/image', storageController.deleteImage)
storageRouter.delete('/icon', storageController.deleteIcon)
