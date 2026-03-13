import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { checkLlmLimit } from './checkSubscriptionLimits'

vi.mock('../services/stripeService', () => ({
  getAiAccessDecision: vi.fn()
}))

vi.mock('../config/stripeConfig', () => ({
  PLANS: {
    FREE: {
      priceId: null,
      limits: { storageMB: 50, llmCallsPerMonth: 0 }
    },
    PRO: {
      priceId: 'price_pro',
      limits: { storageMB: 5120, llmCallsPerMonth: 200 }
    },
    ENTERPRISE: {
      priceId: 'price_enterprise',
      limits: { storageMB: 51200, llmCallsPerMonth: -1 }
    }
  }
}))

const stripeService = await import('../services/stripeService')

describe('checkSubscriptionLimits middleware', () => {
  let mockRequest: { user?: { email: string, subscription?: { plan: 'FREE' | 'PRO' | 'ENTERPRISE' }, quota?: number } }
  let mockResponse: Partial<Response>
  let nextFunction: Mock

  beforeEach(() => {
    mockRequest = {} as any
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    }
    nextFunction = vi.fn()
    vi.clearAllMocks()
  })

  describe('checkLlmLimit', () => {
    it('should return 401 if user is not authenticated', async () => {
      await checkLlmLimit(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' })
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('should call next() when AI access is allowed', async () => {
      mockRequest.user = {
        email: 'pro@test.com',
        subscription: { plan: 'PRO' }
      }
      vi.mocked(stripeService.getAiAccessDecision).mockResolvedValue({
        success: true,
        data: {
          allowed: true,
          plan: 'PRO',
          limit: 200,
          currentCount: 12,
          resetAt: new Date()
        }
      })

      await checkLlmLimit(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(stripeService.getAiAccessDecision).toHaveBeenCalledWith('pro@test.com')
      expect(nextFunction).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should return 403 when FREE plan tries to use AI', async () => {
      mockRequest.user = {
        email: 'free@test.com',
        subscription: { plan: 'FREE' }
      }
      vi.mocked(stripeService.getAiAccessDecision).mockResolvedValue({
        success: true,
        data: {
          allowed: false,
          plan: 'FREE',
          limit: 0,
          currentCount: 0,
          resetAt: new Date(),
          statusCode: 403,
          message: 'La IA no está disponible en el plan FREE. Actualiza al plan PRO para usar esta función.'
        }
      })

      await checkLlmLimit(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockResponse.status).toHaveBeenCalledWith(403)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'AI access denied',
        message: 'La IA no está disponible en el plan FREE. Actualiza al plan PRO para usar esta función.',
        limit: 0,
        plan: 'FREE'
      })
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('should return 403 when PRO billing-period limit is exceeded', async () => {
      mockRequest.user = {
        email: 'pro@test.com',
        subscription: { plan: 'PRO' }
      }
      vi.mocked(stripeService.getAiAccessDecision).mockResolvedValue({
        success: true,
        data: {
          allowed: false,
          plan: 'PRO',
          limit: 200,
          currentCount: 200,
          resetAt: new Date(),
          statusCode: 403,
          message: 'Has alcanzado el límite de 200 llamadas de IA en tu periodo de facturación actual. Actualiza tu plan para continuar.'
        }
      })

      await checkLlmLimit(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockResponse.status).toHaveBeenCalledWith(403)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'AI access denied',
        message: 'Has alcanzado el límite de 200 llamadas de IA en tu periodo de facturación actual. Actualiza tu plan para continuar.',
        limit: 200,
        plan: 'PRO'
      })
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('should return 500 when access lookup fails', async () => {
      mockRequest.user = {
        email: 'error@test.com',
        subscription: { plan: 'PRO' }
      }
      vi.mocked(stripeService.getAiAccessDecision).mockResolvedValue({
        success: false,
        error: 'Error checking AI access'
      })

      await checkLlmLimit(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Error checking AI access' })
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('should call next(error) when an exception occurs', async () => {
      const testError = new Error('Unexpected error')
      mockRequest.user = {
        email: 'error@test.com',
        subscription: { plan: 'PRO' }
      }
      vi.mocked(stripeService.getAiAccessDecision).mockRejectedValue(testError)

      await checkLlmLimit(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(nextFunction).toHaveBeenCalledWith(testError)
    })
  })
})
