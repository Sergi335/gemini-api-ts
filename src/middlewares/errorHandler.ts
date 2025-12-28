import { NextFunction, Request, Response } from 'express'

export interface AppError extends Error {
  statusCode?: number
  isOperational?: boolean
}

export const globalErrorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Set default values
  err.statusCode = err.statusCode ?? 500
  err.message = err.message !== '' ? err.message : 'Internal Server Error'

  // Log error for debugging
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    statusCode: err.statusCode,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  })

  // Detect CSRF errors
  const isCsrfError = err.message?.toLowerCase().includes('csrf') ||
                      err.message?.toLowerCase().includes('invalid csrf token') ||
                      (err.statusCode === 403 && req.path !== '/csrf-token')

  // Send error response
  if (err.statusCode === 500) {
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    })
  } else {
    res.status(err.statusCode).json({
      status: 'fail',
      message: err.message,
      csrfError: isCsrfError
    })
  }
}

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export const createError = (message: string, statusCode: number): AppError => {
  const error = new Error(message) as AppError
  error.statusCode = statusCode
  error.isOperational = true
  return error
}
