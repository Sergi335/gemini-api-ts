import { Request, Response, NextFunction } from 'express'
import { getAuth } from 'firebase-admin/auth'

export const checkUserSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const sessionCookie = req.cookies?.session ?? undefined
  const logMessage = `Petición ${Date.now()}, url: ${req.baseUrl}, method: ${req.method}, cookies: ${String(sessionCookie?.length)}}`
  if (sessionCookie === undefined) {
    res.status(401).send({ error: 'NOT COOKIE!' }) // por que si le mando un 401 da error de cors?
    return
  }
  // Verify the session cookie. In this case an additional check is added to detect
  // if the user's Firebase session was revoked, user deleted/disabled, etc.
  getAuth()
    .verifySessionCookie(sessionCookie, true /** checkRevoked */)
    .then(decodedClaims => {
      if (decodedClaims.email === 'sergiadn@hotmail.com') {
        req.user = { name: 'sergiadn@hotmail.com' }
        // Estamos logeados con la cuenta de sergiadn@hotmail, pero con el nombre de sergiadn335@gmail.com (SergioSR) y por lo tanto sus datos
        console.log(`${logMessage} --> Usuario con email ${decodedClaims.email} autenticado correctamente como ${req.user.name}`)
      } else if (decodedClaims.email === 'sergiadn335@gmail.com') {
        req.user = { name: 'SergioSR' }
      } else {
        req.user = { name: decodedClaims.email ?? '' }
        console.log(`${logMessage} --> Usuario con email ${decodedClaims.email ?? ''} autenticado correctamente`)
      }
      next()
    })
    .catch((error) => {
      // Session cookie is unavailable or invalid. Force user to login.
      console.log('Error desde el Middeware')
      console.log('🚀 ~ file: authController.js:168 ~ checkUserSession ~ sessionCookie:', sessionCookie.length)
      console.log(error)
      res.status(401).send({ error: 'MIDDLEWARE UNAUTHORIZE REQUEST!' })
    })
}
