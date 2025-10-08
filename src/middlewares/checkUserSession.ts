import { NextFunction, Response } from 'express'
import { getAuth } from 'firebase-admin/auth'
import { userModel } from '../models/userModel'
import { RequestWithUser } from '../types/express'

export const checkUserSession = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
  const sessionCookie = req.cookies?.session ?? undefined

  // const logMessage = `Petición ${Date.now()}, url: ${req.baseUrl}, method: ${req.method}, cookies: ${String(sessionCookie?.length)}}`
  if (sessionCookie === undefined) {
    res.status(401).send({ error: 'NOT COOKIE!' })
    return
  }
  const csrfToken = req.headers['x-csrf-token'] as string | undefined
  if (csrfToken !== req.cookies.csrfToken) {
    res.status(401).send({ message: 'NO COINCIDE UNAUTHORIZED REQUEST!' })
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

    // Guarda el id y el nombre en req.user para el resto de la app
    req.user = { _id: user._id?.toString?.() ?? '', email: userEmail, name: user.name ?? '' }
    next()
  } catch (error) {
    console.log('Error desde el Middleware', error)
    res.status(401).send({ error: 'MIDDLEWARE UNAUTHORIZE REQUEST!' })
  }
}
