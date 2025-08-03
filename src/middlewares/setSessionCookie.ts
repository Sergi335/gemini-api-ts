import { Request, Response, NextFunction } from 'express'
import { getAuth } from 'firebase-admin/auth'

export const setSessionCookie = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (
      typeof req.body.idToken !== 'string' ||
      req.body.idToken.trim() === '' ||
      typeof req.body.csrfToken !== 'string' ||
      req.body.csrfToken.trim() === ''
    ) {
      res.status(400).send({ error: 'BAD REQUEST! FALTAN DATOS' })
      return
    }
    const idToken = req.body.idToken.toString()
    const csrfToken = req.body.csrfToken.toString()
    console.log('🚀 ~ sessionCookieMiddleware ~ csrfToken:', csrfToken)
    console.log('🚀 ~ sessionCookieMiddleware ~ idToken:', req.cookies.csrfToken)
    // Guard against CSRF attacks.
    if (csrfToken !== req.cookies.csrfToken) {
      res.status(401).send({ message: 'NO COINCIDE UNAUTHORIZED REQUEST! setSessionCookie' })
      return
    }
    // Set session expiration to 5 days.
    const expiresIn = 60 * 60 * 24 * 5 * 1000
    // Create the session cookie. This will also verify the ID token in the process.
    // The session cookie will have the same claims as the ID token.
    // To only allow session cookie setting on recent sign-in, auth_time in ID token
    // can be checked to ensure user was recently signed in before creating a session cookie.
    getAuth()
      .createSessionCookie(idToken, { expiresIn })
      .then(
        (sessionCookie) => {
          // Set cookie policy for session cookie.
          const options = { maxAge: expiresIn, httpOnly: true, secure: true, sameSite: 'none' as const }
          console.log('Cookie creada con éxito')
          res.cookie('session', sessionCookie, options)
          next()
        },
        (error) => {
          console.log(error)
          res.status(401).send('UNAUTHORIZED REQUEST!')
        }
      )
  } catch (error) {
    res.send({ error: 'ERROR INEXPLICABLE' })
  }
}
