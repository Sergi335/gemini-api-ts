import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as stripeService from './stripeService'
import { stripe } from '../config/stripeConfig'
import users from '../models/schemas/userSchema'
import type { User } from '../types/userModel.types'

// Mock dependencies
vi.mock('../config/stripeConfig', () => {
  return {
    stripe: {
      customers: {
        create: vi.fn(),
        retrieve: vi.fn()
      },
      checkout: {
        sessions: {
          create: vi.fn()
        }
      },
      billingPortal: {
        sessions: {
          create: vi.fn()
        }
      },
      subscriptions: {
        retrieve: vi.fn()
      },
      webhooks: {
        constructEvent: vi.fn()
      }
    },
    // Mock PLANS and helpers usually exported
    PLANS: {
      FREE: { limits: { storageMB: 50, llmCallsPerMonth: 20 } },
      PRO: { limits: { storageMB: 5120, llmCallsPerMonth: 500 } },
      ENTERPRISE: { limits: { storageMB: 51200, llmCallsPerMonth: -1 } }
    },
    getPlanByPriceId: (priceId: string) => {
      if (priceId === 'price_pro') return 'PRO'
      if (priceId === 'price_free') return 'FREE'
      return null
    },
    getPlanLimits: (plan: string) => {
      if (plan === 'PRO') return { storageMB: 5120, llmCallsPerMonth: 500 }
      return { storageMB: 50, llmCallsPerMonth: 20 }
    }
  }
})

vi.mock('../models/schemas/userSchema', () => ({
  default: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn()
  }
}))

describe('Stripe Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
  })

  afterEach(() => {
    delete process.env.STRIPE_WEBHOOK_SECRET
  })

  describe('getOrCreateCustomer', () => {
    const mockUser: User = {
      email: 'test@example.com',
      name: 'Test User',
      _id: 'user123'
    }

    it('should return existing stripeCustomerId if present in user object', async () => {
      const userWithId = { ...mockUser, stripeCustomerId: 'cus_123' }
      const result = await stripeService.getOrCreateCustomer(userWithId)

      expect(result.success).toBe(true)
      expect(result.data).toBe('cus_123')
      expect(stripe.customers.create).not.toHaveBeenCalled()
    })

    it('should return existing stripeCustomerId if found in database', async () => {
      vi.mocked(users.findOne).mockResolvedValue({ stripeCustomerId: 'cus_db_123' })

      const result = await stripeService.getOrCreateCustomer(mockUser)

      expect(result.success).toBe(true)
      expect(result.data).toBe('cus_db_123')
      expect(stripe.customers.create).not.toHaveBeenCalled()
    })

    it('should create new customer if not found', async () => {
      vi.mocked(users.findOne).mockResolvedValue(null)
      vi.mocked(stripe.customers.create).mockResolvedValue({ id: 'cus_new_123' } as any)

      const result = await stripeService.getOrCreateCustomer(mockUser)

      expect(result.success).toBe(true)
      expect(result.data).toBe('cus_new_123')
      expect(stripe.customers.create).toHaveBeenCalledWith({
        email: mockUser.email,
        name: mockUser.name,
        metadata: { userId: mockUser._id }
      })
      expect(users.findOneAndUpdate).toHaveBeenCalledWith(
        { email: mockUser.email },
        { stripeCustomerId: 'cus_new_123' }
      )
    })

    it('should handle errors when creating customer', async () => {
      vi.mocked(users.findOne).mockResolvedValue(null)
      vi.mocked(stripe.customers.create).mockRejectedValue(new Error('Stripe error'))

      const result = await stripeService.getOrCreateCustomer(mockUser)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Error creating Stripe customer')
    })
  })

  describe('createCheckoutSession', () => {
    it('should create a checkout session successfully', async () => {
      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({ url: 'https://checkout.stripe.com/test' } as any)

      const result = await stripeService.createCheckoutSession(
        'cus_123',
        'price_123',
        'https://example.com/success',
        'https://example.com/cancel'
      )

      expect(result.success).toBe(true)
      expect(result.data).toBe('https://checkout.stripe.com/test')
      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({
        customer: 'cus_123',
        mode: 'subscription',
        line_items: [{ price: 'price_123', quantity: 1 }],
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel'
      }))
    })

    it('should handle errors', async () => {
      vi.mocked(stripe.checkout.sessions.create).mockRejectedValue(new Error('Stripe error'))

      const result = await stripeService.createCheckoutSession(
        'cus_123',
        'price_123',
        'url',
        'url'
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Error creating checkout session')
    })
  })

  describe('createPortalSession', () => {
    it('should create a portal session successfully', async () => {
      vi.mocked(stripe.billingPortal.sessions.create).mockResolvedValue({ url: 'https://portal.stripe.com/test' } as any)

      const result = await stripeService.createPortalSession('cus_123', 'https://example.com')

      expect(result.success).toBe(true)
      expect(result.data).toBe('https://portal.stripe.com/test')
      expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_123',
        return_url: 'https://example.com'
      })
    })

    it('should handle errors', async () => {
      vi.mocked(stripe.billingPortal.sessions.create).mockRejectedValue(new Error('Stripe error'))

      const result = await stripeService.createPortalSession('cus_123', 'url')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Error creating portal session')
    })
  })

  describe('handleWebhookEvent', () => {
    it('should handle checkout.session.completed', async () => {
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            customer: 'cus_123',
            subscription: 'sub_123'
          }
        }
      } as any

      // Mock subscription retrieval
      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue({
        id: 'sub_123',
        items: { data: [{ price: { id: 'price_pro' } }] },
        current_period_end: 1234567890,
        cancel_at_period_end: false
      } as any)

      // Mock plan config lookup implicitly by mocking the return of getPlanByPriceId if it was exported but here we rely on logic
      // Note: In integration test we might need real config or careful mocking.
      // Since PLANS depends on env vars and getPlanByPriceId imports them, let's assume 'price_pro' maps to PRO if we set env var or mocking config.
      // But we can verify arguments passed to findOneAndUpdate.

      const result = await stripeService.handleWebhookEvent(event)

      expect(result.success).toBe(true)
      expect(users.findOneAndUpdate).toHaveBeenCalledWith(
        { stripeCustomerId: 'cus_123' },
        expect.objectContaining({
          subscription: expect.objectContaining({
            status: 'active',
            stripeSubscriptionId: 'sub_123'
          })
        })
      )
    })

    it('should handle customer.subscription.updated', async () => {
      const event = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            customer: 'cus_123',
            id: 'sub_123',
            status: 'past_due',
            current_period_end: 1234567890,
            cancel_at_period_end: true,
            items: { data: [{ price: { id: 'price_free' } }] }
          }
        }
      } as any

      const result = await stripeService.handleWebhookEvent(event)

      expect(result.success).toBe(true)
      expect(users.findOneAndUpdate).toHaveBeenCalledWith(
        { stripeCustomerId: 'cus_123' },
        expect.objectContaining({
          subscription: expect.objectContaining({
            status: 'past_due',
            cancelAtPeriodEnd: true
          })
        })
      )
    })

    it('should handle customer.subscription.deleted', async () => {
      const event = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            customer: 'cus_123'
          }
        }
      } as any

      const result = await stripeService.handleWebhookEvent(event)

      expect(result.success).toBe(true)
      expect(users.findOneAndUpdate).toHaveBeenCalledWith(
        { stripeCustomerId: 'cus_123' },
        expect.objectContaining({
          subscription: expect.objectContaining({
            status: 'free',
            plan: 'FREE'
          })
        })
      )
    })

    it('should return null if webhook secret is missing', () => {
      delete process.env.STRIPE_WEBHOOK_SECRET
      const event = stripeService.constructWebhookEvent(Buffer.from('test'), 'sig')
      expect(event).toBeNull()
    })

    it('should return event if signature is valid', () => {
      const mockEvent = { id: 'evt_123' }
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(mockEvent as any)

      const event = stripeService.constructWebhookEvent(Buffer.from('test'), 'sig')
      expect(event).toBe(mockEvent)
    })
  })
})
