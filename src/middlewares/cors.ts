import { NextFunction, Request, Response } from 'express'

const ACCEPTED_ORIGINS = [
  'http://localhost:5173',
  'https://zenmarks.vercel.app'
]

const cors = (req: Request, res: Response, next: NextFunction): void => {
  const origin = req.headers.origin

  if (typeof origin === 'string' && origin.length > 0 && ACCEPTED_ORIGINS.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin)
    res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE')
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-justlinks-user, x-justlinks-token, x-csrf-token')
    res.header('Access-Control-Allow-Credentials', 'true')
  }

  if (req.method === 'OPTIONS') {
    res.sendStatus(200)
    return
  }

  next()
}

export default cors
