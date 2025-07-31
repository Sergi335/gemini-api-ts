import { Request, Response, NextFunction } from 'express'

export const attachCsrfToken = (route: string, cookieName: string, csrfToken: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const expiresIn = 60 * 60 * 24 * 5 * 1000
    const isLocal = process.env.NODE_ENV !== 'production'
    const options = {
      maxAge: expiresIn,
      httpOnly: true,
      secure: !isLocal, // false en local, true en producción
      sameSite: isLocal ? 'lax' as const : 'none' as const
    }
    res.cookie(cookieName, csrfToken, options)
    res.send({ csrfToken })
    next()
  }
}
