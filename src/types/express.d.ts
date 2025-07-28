import { Request } from 'express'

export interface AuthenticatedRequest extends Request {
  user: {
    name: string
    // add other user properties if needed
  }
}
