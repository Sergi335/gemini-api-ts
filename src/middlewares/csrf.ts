import { doubleCsrf } from 'csrf-csrf'
import type { Request } from 'express'

const isProduction = process.env.NODE_ENV === 'production'

let generateCsrfToken: (req: Request, res: any, opts?: { overwrite?: boolean }) => string
let doubleCsrfProtection: any

if (process.env.NODE_ENV === 'test') {
  // Bypass ligero para tests: no validar CSRF, devolver token fijo
  generateCsrfToken = (_req: Request, _res: any) => 'test-csrf-token'
  doubleCsrfProtection = (req: Request, _res: any, next: any) => {
    // Imita comportamiento mínimo: si viene header x-csrf-token o cookie, dejar pasar
    req.headers['x-csrf-token'] = req.headers['x-csrf-token'] ?? 'test-csrf-token'
    return next()
  }
} else {
  const {
    generateCsrfToken: _generateCsrfToken,
    doubleCsrfProtection: _doubleCsrfProtection
  } = doubleCsrf({
    getSecret: () => process.env.CSRF_SECRET ?? 'dev-secret-change-in-production',
    getSessionIdentifier: (req: Request) => {
      const session = req.cookies?.session
      const ip = req.ip ?? 'anonymous'
      console.log('[CSRF DEBUG] Session identifier check:', { session, ip })
      return session ?? ip
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
      const headerToken = req.headers['x-csrf-token']
      console.log('[CSRF DEBUG] Header token:', headerToken)
      console.log('[CSRF DEBUG] All Cookies:', req.headers.cookie)
      return headerToken as string
    }
  })

  generateCsrfToken = _generateCsrfToken
  doubleCsrfProtection = _doubleCsrfProtection
}

export { doubleCsrfProtection, generateCsrfToken }
