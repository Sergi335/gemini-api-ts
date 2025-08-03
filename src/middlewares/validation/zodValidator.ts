import { NextFunction, Request, Response } from 'express'
import { z } from 'zod'
import { ValidationError, ValidationOptions } from '../../types/validation.types'

export const validateRequest = (options: ValidationOptions) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: ValidationError[] = []

    try {
      // Validar body
      if (options.body != null) {
        const result = options.body.safeParse(req.body)
        if (!result.success) {
          const bodyErrors = result.error.issues.map(issue => ({
            field: `body.${issue.path.join('.')}`,
            message: issue.message,
            code: issue.code
          }))
          errors.push(...bodyErrors)
        } else {
          req.body = result.data
        }
      }

      // Validar params
      if (options.params != null) {
        const result = options.params.safeParse(req.params)
        if (!result.success) {
          const paramErrors = result.error.issues.map(issue => ({
            field: `params.${issue.path.join('.')}`,
            message: issue.message,
            code: issue.code
          }))
          errors.push(...paramErrors)
        } else {
          req.params = result.data
        }
      }

      // Validar query
      if (options.query != null) {
        const result = options.query.safeParse(req.query)
        if (!result.success) {
          const queryErrors = result.error.issues.map(issue => ({
            field: `query.${issue.path.join('.')}`,
            message: issue.message,
            code: issue.code
          }))
          errors.push(...queryErrors)
        } else {
          req.query = result.data
        }
      }

      // Validar headers
      if (options.headers != null) {
        const result = options.headers.safeParse(req.headers)
        if (!result.success) {
          const headerErrors = result.error.issues.map(issue => ({
            field: `headers.${issue.path.join('.')}`,
            message: issue.message,
            code: issue.code
          }))
          errors.push(...headerErrors)
        }
      }

      // Si hay errores, responder con 400
      if (errors.length > 0) {
        res.status(400).json({
          status: 'fail',
          message: 'Validation failed',
          errors
        })
        return
      }

      next()
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Internal validation error'
      })
    }
  }
}

// Shorthand para validar solo body
export const validateBody = (schema: z.ZodSchema): ((req: Request, res: Response, next: NextFunction) => void) => {
  return validateRequest({ body: schema })
}

// Shorthand para validar solo params
export const validateParams = (schema: z.ZodSchema): ((req: Request, res: Response, next: NextFunction) => void) => {
  return validateRequest({ params: schema })
}

// Shorthand para validar solo query
export const validateQuery = (schema: z.ZodSchema): ((req: Request, res: Response, next: NextFunction) => void) => {
  return validateRequest({ query: schema })
}

// Middleware para validar usuario autenticado
export const validateUser = (req: any, res: Response, next: NextFunction): void => {
  const user = req.user?.name

  if (user === undefined || user === null || user === '') {
    res.status(401).json({
      status: 'fail',
      message: 'Usuario no autenticado'
    })
    return
  }

  next()
}
