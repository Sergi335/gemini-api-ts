import { NextFunction, Response } from 'express'
import { getAuth } from 'firebase-admin/auth'
import { userModel } from '../models/userModel'
import { RequestWithUser } from '../types/express'

export const checkUserSession = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
  const sessionCookie = req.cookies?.session ?? undefined

  // CSRF ya validado por doubleCsrfProtection en app.ts

  if (sessionCookie === undefined) {
    res.status(401).send({ error: 'No hay cookie de sesión' })
    return
  }

  try {
    const decodedClaims = await getAuth().verifySessionCookie(sessionCookie, true)
    const userEmail = decodedClaims.email ?? ''
    const user = await userModel.getUser({ email: userEmail })
    // console.log('🚀 ~ checkUserSession ~ user:', user)

    if (user == null || 'error' in user) {
      res.status(401).send({ error: 'Usuario no encontrado' })
      return
    }

    // Guarda el usuario en req.user para el resto de la app
    req.user = user
    next()
  } catch (error) {
    console.log('Error desde el Middleware', error)
    res.status(401).send({ error: 'MIDDLEWARE UNAUTHORIZE REQUEST!' })
  }
}
