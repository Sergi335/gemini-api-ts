import { Request, Response } from 'express'
import { beforeEach, describe, expect, it, MockedFunction, vi } from 'vitest'
import { z } from 'zod'
import { RequestWithUser } from '../../types/express'
import { createCategoryBodySchema } from './validationSchemas'
import { validateBody, validateUser } from './zodValidator'

describe('zodValidator middleware', () => {
  let mockRequest: Partial<RequestWithUser>
  let mockResponse: Partial<Response>
  let nextFunction: MockedFunction<any>

  beforeEach(() => {
    mockRequest = {
      body: {},
      params: {},
      query: {},
      headers: {}
    }
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    }
    nextFunction = vi.fn()
  })

  describe('validateBody', () => {
    it('should pass validation with valid data', () => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email()
      })

      mockRequest.body = {
        name: 'Test User',
        email: 'test@example.com'
      }

      const middleware = validateBody(schema)
      middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(nextFunction).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should fail validation with invalid data', () => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email()
      })

      mockRequest.body = {
        name: '',
        email: 'invalid-email'
      }

      const middleware = validateBody(schema)
      middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(nextFunction).not.toHaveBeenCalled()
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: expect.stringContaining('body'),
            message: expect.any(String),
            code: expect.any(String)
          })
        ])
      })
    })
  })

  describe('validateUser', () => {
    it('should pass with valid user', () => {
      mockRequest.user = { _id: '123', email: 'test@example.com', name: 'testuser' }

      validateUser(mockRequest, mockResponse as Response, nextFunction)

      expect(nextFunction).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should fail with no user', () => {
      mockRequest.user = undefined

      validateUser(mockRequest, mockResponse as Response, nextFunction)

      expect(nextFunction).not.toHaveBeenCalled()
      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Usuario no autenticado'
      })
    })
  })

  describe('createCategoryBodySchema', () => {
    it('should validate category creation data', () => {
      const validData = {
        name: 'Test Category',
        parentId: 'parent123',
        order: 1,
        hidden: false
      }

      const result = createCategoryBodySchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid category creation data', () => {
      const invalidData = {
        name: '', // Empty name should fail
        order: -1 // Negative order should fail
      }

      const result = createCategoryBodySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})
