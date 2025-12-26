
import { NextFunction, Request, Response } from 'express'
import { getAuth } from 'firebase-admin/auth'
import { generateCsrfToken } from './csrf'

export const setSessionCookie = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const idToken = req.body.idToken

    console.log('[setSessionCookie] idToken recibido:', idToken)
    console.log('[setSessionCookie] Cookies recibidas:', req.cookies)
    console.log('[setSessionCookie] Headers recibidos:', req.headers)

    if (typeof idToken !== 'string' || idToken.trim() === '') {
      console.log('[setSessionCookie] idToken inválido')
      res.status(400).send({ error: 'idToken es requerido' })
      return
    }

    // CSRF ya validado por doubleCsrfProtection en app.ts

    const expiresIn = 60 * 60 * 24 * 5 * 1000 // 5 días
    const isProduction = process.env.NODE_ENV === 'production'

    const sessionCookie = await getAuth().createSessionCookie(idToken, { expiresIn })

    const options = {
      maxAge: expiresIn,
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' as const : 'lax' as const
    }

    res.cookie('session', sessionCookie, options)
    console.log('[setSessionCookie] Cookie de sesión creada:', sessionCookie)
    console.log('[setSessionCookie] Opciones de cookie:', options)

    // Regenerar el token CSRF tras login
    const newCsrfToken = generateCsrfToken(req, res, { overwrite: true })
    console.log('[setSessionCookie] Nuevo CSRF token generado tras login:', newCsrfToken)
    res.locals.csrfToken = newCsrfToken

    next()
  } catch (error) {
    console.error('[setSessionCookie] Error:', error)
    res.status(401).send({ error: 'Token inválido o expirado' })
  }
}
