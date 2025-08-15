import express from 'express'
import multer from 'multer'
import { z } from 'zod'
import { storageController } from '../../controllers/storageController'
import limitStorage from '../../middlewares/limitStorage'
import {
  deleteImageBodySchema,
  uploadImageBodySchema
} from '../../middlewares/validation/validationSchemas'
import { validateBody } from '../../middlewares/validation/zodValidator'

const upload = multer()

export const storageRouter = express.Router()

// Rutas GET - no necesitan validación adicional
storageRouter.get('/backgrounds', storageController.getBackgroundsMiniatures)
storageRouter.get('/backgroundurl', storageController.getBackgroundUrl)
storageRouter.get('/icons', storageController.getLinkIcons)
storageRouter.get('/backup', storageController.getUserBackup)

// Rutas POST - con validación de body cuando corresponde
storageRouter.post('/backup', storageController.createUserBackup)
storageRouter.post('/restorebackup',
  upload.single('backup'),
  storageController.restoreUserBackup
)
storageRouter.post('/image',
  upload.single('images'),
  limitStorage,
  validateBody(uploadImageBodySchema),
  storageController.uploadImage
)
storageRouter.post('/icon',
  upload.single('linkImg'),
  limitStorage,
  storageController.uploadIcon
)
storageRouter.post('/profilepic',
  upload.single('file'),
  limitStorage,
  storageController.uploadProfileImage
)

// Rutas DELETE - con validación de body
storageRouter.delete('/image',
  validateBody(deleteImageBodySchema),
  storageController.deleteImage
)
storageRouter.delete('/icon',
  validateBody(z.object({
    image: z.string().min(1, 'Nombre de imagen requerido')
  })),
  storageController.deleteIcon
)
