import { Request, Response, NextFunction } from 'express';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const MAX_USER_QUOTA = parseInt(process.env.MAX_USER_QUOTA || '0');

const limitStorage = (req: Request, res: Response, next: NextFunction) => {
  // Placeholder for storage limiting logic
  // This will involve checking user's current storage against MAX_USER_QUOTA
  // and bypassing for ADMIN_EMAIL
  console.log('Storage limiting middleware (placeholder)');
  next();
};

export default limitStorage;