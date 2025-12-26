import { doubleCsrf } from 'csrf-csrf'
import type { Request } from 'express'

const isProduction = process.env.NODE_ENV === 'production'

const {
  generateCsrfToken,
  doubleCsrfProtection
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET ?? 'dev-secret-change-in-production',
  getSessionIdentifier: (req: Request) => {
    console.log('[CSRF] session cookie:', req.cookies?.session)
    return req.cookies?.session ?? req.ip ?? 'anonymous'
  },
  cookieName: isProduction ? '__Host-csrf-token' : 'csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
    path: '/',
    maxAge: 60 * 60 * 24 * 5
  },
  getCsrfTokenFromRequest: (req: Request) => {
    console.log('[CSRF] x-csrf-token header:', req.headers['x-csrf-token'])
    return req.headers['x-csrf-token'] as string
  }
})

export { doubleCsrfProtection, generateCsrfToken }
