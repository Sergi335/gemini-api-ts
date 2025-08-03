import { z } from 'zod'

export type ValidationTarget = 'body' | 'params' | 'query' | 'headers'

export interface ValidationOptions {
  body?: z.ZodSchema
  params?: z.ZodSchema
  query?: z.ZodSchema
  headers?: z.ZodSchema
  stripUnknown?: boolean
}

export interface ValidationError {
  field: string
  message: string
  code: string
}
