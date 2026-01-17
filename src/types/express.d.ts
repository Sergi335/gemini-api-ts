import { Request as ExpressRequest } from 'express'
import { User } from './userModel.types'

// Interfaz extendida que se puede importar
export interface RequestWithUser extends ExpressRequest {
  user?: User
  file?: Express.Multer.File
  body: any
}

// Extensión global para compatibilidad futura (cuando ts-node-dev lo soporte mejor)
declare module 'express-serve-static-core' {
  interface Request {
    user?: User
    file?: Express.Multer.File
  }
}

// Re-exportar para compatibilidad
export interface AuthenticatedRequest extends ExpressRequest {
  user: User
}
