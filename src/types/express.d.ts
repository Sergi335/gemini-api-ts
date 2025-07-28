// Extensión de los tipos de Express
import { Request as ExpressRequest } from 'express'

// Interfaz extendida que se puede importar
export interface RequestWithUser extends ExpressRequest {
  user?: {
    name: string
    // add other user properties if needed
  }
}

// Extensión global para compatibilidad futura (cuando ts-node-dev lo soporte mejor)
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      name: string
      // add other user properties if needed
    }
  }
}

// Re-exportar para compatibilidad
export interface AuthenticatedRequest extends ExpressRequest {
  user: {
    name: string
    // add other user properties if needed
  }
}
