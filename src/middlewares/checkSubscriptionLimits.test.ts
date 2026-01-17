import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi, type MockedFunction, type Mock } from 'vitest'
import { checkLlmLimit, checkStorageLimit } from './checkSubscriptionLimits'
import type { Subscription } from '../types/userModel.types'
import users from '../models/schemas/userSchema'

// Mock the userSchema module
vi.mock('../models/schemas/userSchema', () => ({
  default: {
    findOne: vi.fn()
  }
}))

// Mock the stripeConfig module to avoid Stripe initialization issues
vi.mock('../config/stripeConfig', () => ({
  PLANS: {
    FREE: {
      priceId: null,
      limits: { storageMB: 50, llmCallsPerMonth: 20 }
    },
    PRO: {
      priceId: 'price_pro',
      limits: { storageMB: 5120, llmCallsPerMonth: 500 }
    },
    ENTERPRISE: {
      priceId: 'price_enterprise',
      limits: { storageMB: 51200, llmCallsPerMonth: -1 }
    }
  }
}))

// Helper to create a valid subscription object
function createSubscription (plan: 'FREE' | 'PRO' | 'ENTERPRISE'): Subscription {
  return {
    status: plan === 'FREE' ? 'free' : 'active',
    plan,
    cancelAtPeriodEnd: false
  }
}

interface MockUser {
  email: string
  name?: string
  subscription?: Subscription
  quota?: number
  llmCallsThisMonth?: number
  llmCallsResetAt?: Date
}

describe('checkSubscriptionLimits middleware', () => {
  let mockRequest: { user?: MockUser }
  let mockResponse: Partial<Response>
  let nextFunction: Mock
  let mockFindOne: MockedFunction<any>

  beforeEach(() => {
    mockRequest = {}
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    }
    nextFunction = vi.fn()
    mockFindOne = users.findOne as MockedFunction<any>
    vi.clearAllMocks()
  })

  describe('checkLlmLimit', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined

      await checkLlmLimit(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' })
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('should call next() for ENTERPRISE plan (unlimited calls)', async () => {
      const user: MockUser = {
        email: 'enterprise@test.com',
        subscription: createSubscription('ENTERPRISE')
      }
      mockRequest.user = user

      await checkLlmLimit(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(nextFunction).toHaveBeenCalled()
      expect(mockFindOne).not.toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should call next() when LLM limit is not exceeded', async () => {
      const user: MockUser = {
        email: 'free@test.com',
        subscription: createSubscription('FREE')
      }
      mockRequest.user = user

      mockFindOne.mockResolvedValue({
        llmCallsThisMonth: 5,
        llmCallsResetAt: new Date(),
        email: 'free@test.com'
      })

      await checkLlmLimit(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockFindOne).toHaveBeenCalledWith({ email: 'free@test.com' })
      expect(nextFunction).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should return 429 when LLM limit is exceeded', async () => {
      const user: MockUser = {
        email: 'free@test.com',
        subscription: createSubscription('FREE')
      }
      mockRequest.user = user

      mockFindOne.mockResolvedValue({
        llmCallsThisMonth: 20,
        llmCallsResetAt: new Date(),
        email: 'free@test.com'
      })

      await checkLlmLimit(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockFindOne).toHaveBeenCalledWith({ email: 'free@test.com' })
      expect(mockResponse.status).toHaveBeenCalledWith(429)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'LLM call limit exceeded',
        message: 'You have reached your monthly limit of 20 LLM calls. Upgrade your plan for more.',
        limit: 20,
        plan: 'FREE'
      })
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('should default to FREE plan if subscription is undefined', async () => {
      const user: MockUser = {
        email: 'noplan@test.com'
      }
      mockRequest.user = user

      mockFindOne.mockResolvedValue({
        llmCallsThisMonth: 1,
        llmCallsResetAt: new Date(),
        email: 'noplan@test.com'
      })

      await checkLlmLimit(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockFindOne).toHaveBeenCalledWith({ email: 'noplan@test.com' })
      expect(nextFunction).toHaveBeenCalled()
    })

    it('should allow if new month reset applies', async () => {
      const user: MockUser = {
        email: 'reset@test.com',
        subscription: createSubscription('FREE')
      }
      mockRequest.user = user

      // Date from last month
      const lastMonth = new Date()
      lastMonth.setMonth(lastMonth.getMonth() - 1)

      mockFindOne.mockResolvedValue({
        llmCallsThisMonth: 25, // Over limit
        llmCallsResetAt: lastMonth,
        email: 'reset@test.com'
      })

      await checkLlmLimit(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockFindOne).toHaveBeenCalledWith({ email: 'reset@test.com' })
      expect(nextFunction).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should call next(error) when an exception occurs', async () => {
      const testError = new Error('Database connection failed')
      const user: MockUser = {
        email: 'error@test.com',
        subscription: createSubscription('FREE')
      }
      mockRequest.user = user

      mockFindOne.mockRejectedValue(testError)

      await checkLlmLimit(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(nextFunction).toHaveBeenCalledWith(testError)
    })
  })

  describe('checkStorageLimit', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined

      await checkStorageLimit(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' })
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('should call next() when storage is below limit', async () => {
      const user: MockUser = {
        email: 'free@test.com',
        subscription: createSubscription('FREE'),
        quota: 30 * 1024 * 1024 // 30MB in bytes
      }
      mockRequest.user = user

      await checkStorageLimit(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(nextFunction).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should return 429 when storage limit is reached', async () => {
      const user: MockUser = {
        email: 'free@test.com',
        subscription: createSubscription('FREE'),
        quota: 50 * 1024 * 1024 // 50MB in bytes
      }
      mockRequest.user = user

      await checkStorageLimit(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockResponse.status).toHaveBeenCalledWith(429)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Storage limit exceeded',
        message: 'You have reached your storage limit of 50 MB. Upgrade your plan for more storage.',
        currentMB: 50,
        limitMB: 50,
        plan: 'FREE'
      })
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('should return 429 when storage exceeds limit', async () => {
      const user: MockUser = {
        email: 'free@test.com',
        subscription: createSubscription('FREE'),
        quota: 60 * 1024 * 1024 // 60MB in bytes
      }
      mockRequest.user = user

      await checkStorageLimit(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockResponse.status).toHaveBeenCalledWith(429)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Storage limit exceeded',
        message: 'You have reached your storage limit of 50 MB. Upgrade your plan for more storage.',
        currentMB: 60,
        limitMB: 50,
        plan: 'FREE'
      })
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('should default to quota 0 if undefined', async () => {
      const user: MockUser = {
        email: 'newuser@test.com',
        subscription: createSubscription('FREE')
      }
      mockRequest.user = user

      await checkStorageLimit(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(nextFunction).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should allow PRO users with higher storage limits', async () => {
      const user: MockUser = {
        email: 'pro@test.com',
        subscription: createSubscription('PRO'),
        quota: 3000 * 1024 * 1024 // 3000MB in bytes
      }
      mockRequest.user = user

      await checkStorageLimit(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(nextFunction).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should call next(error) when an exception occurs', async () => {
      const testError = new Error('Unexpected error')
      // Force an error by making the user getter throw
      Object.defineProperty(mockRequest, 'user', {
        get: () => { throw testError },
        configurable: true
      })

      await checkStorageLimit(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(nextFunction).toHaveBeenCalledWith(testError)
    })
  })
})
