import { Request, Response, NextFunction } from 'express';

const ACCEPTED_ORIGINS = ['http://localhost:3000']; // Example origins

const cors = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;

  if (origin && ACCEPTED_ORIGINS.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
};

export default cors;