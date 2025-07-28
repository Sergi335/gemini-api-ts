import { Request, Response, NextFunction, RequestHandler } from 'express'
import { AuthenticatedRequest } from './express'

// Tipo helper para convertir controladores que usan AuthenticatedRequest a RequestHandler de Express
export type AuthenticatedRequestHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next?: NextFunction
) => Promise<Response> | Response

// Helper para convertir un controlador AuthenticatedRequest a un RequestHandler estándar
export const toRequestHandler = (handler: AuthenticatedRequestHandler): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Convertimos el Request estándar a AuthenticatedRequest
    const authReq = req as AuthenticatedRequest
    return await handler(authReq, res, next)
  }
}
