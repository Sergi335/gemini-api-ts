import { Request, Response, NextFunction } from 'express'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL
const MAX_USER_QUOTA = typeof process.env.MAX_USER_QUOTA === 'string' && process.env.MAX_USER_QUOTA.trim() !== ''
  ? parseInt(process.env.MAX_USER_QUOTA, 10)
  : 0

const limitStorage = (req: Request, res: Response, next: NextFunction): void => {
  // Placeholder for storage limiting logic
  // This will involve checking user's current storage against MAX_USER_QUOTA
  // and bypassing for ADMIN_EMAIL
  console.log('Storage limiting middleware (placeholder)')
  next()
}

export default limitStorage
