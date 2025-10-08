import express from 'express'
import multer from 'multer'
import { z } from 'zod'
// import { storageController } from '../../controllers/storageController'
import { storageControllerNew } from '../../controllers/storageControllerNew'
import limitStorage from '../../middlewares/limitStorage'
import {
  deleteImageBodySchema,
  uploadImageBodySchema
} from '../../middlewares/validation/validationSchemas'
import { validateBody } from '../../middlewares/validation/zodValidator'

const upload = multer()

export const storageRouter = express.Router()

// Rutas GET - no necesitan validación adicional
storageRouter.get('/backgrounds', storageControllerNew.getBackgroundsMiniatures)
storageRouter.get('/backgroundurl', storageControllerNew.getBackgroundUrl)
storageRouter.get('/icons', storageControllerNew.getLinkIcons)
storageRouter.get('/backup', storageControllerNew.getUserBackup)
storageRouter.get('/link/:linkId/images', storageControllerNew.getLinkImages)

// Rutas POST - con validación de body cuando corresponde
storageRouter.post('/backup', storageControllerNew.createUserBackup)
storageRouter.post('/restorebackup',
  upload.single('backup'),
  storageControllerNew.restoreUserBackup
)
storageRouter.post('/image',
  upload.single('images'),
  limitStorage,
  validateBody(uploadImageBodySchema),
  storageControllerNew.uploadImage
)
storageRouter.post('/icon',
  upload.single('linkImg'),
  limitStorage,
  storageControllerNew.uploadIcon
)
storageRouter.post('/profilepic',
  upload.single('file'),
  limitStorage,
  storageControllerNew.uploadProfileImage
)

// Rutas DELETE - con validación de body
storageRouter.delete('/image',
  validateBody(deleteImageBodySchema),
  storageControllerNew.deleteImage
)
storageRouter.delete('/icon',
  validateBody(z.object({
    image: z.string().min(1, 'Nombre de imagen requerido')
  })),
  storageControllerNew.deleteIcon
)
