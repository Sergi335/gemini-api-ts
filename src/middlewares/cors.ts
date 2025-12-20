import { NextFunction, Request, Response } from 'express'

const ACCEPTED_ORIGINS = [
  'http://localhost:5173',
  'https://zenmarks.vercel.app'
]

const cors = (req: Request, res: Response, next: NextFunction): void => {
  const origin = req.headers.origin

  // Verificar si el origin está permitido
  if (typeof origin === 'string' && ACCEPTED_ORIGINS.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin)
    res.header('Access-Control-Allow-Credentials', 'true')
  }

  // Estos headers deben enviarse siempre para preflight
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-justlinks-user, x-justlinks-token, x-csrf-token, credentials')

  // Responder inmediatamente a preflight
  if (req.method === 'OPTIONS') {
    res.sendStatus(204)
    return
  }

  next()
}

export default cors
