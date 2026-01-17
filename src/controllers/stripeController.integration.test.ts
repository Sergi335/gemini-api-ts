import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import app from '../app'
import user from '../models/schemas/userSchema'
import * as stripeService from '../services/stripeService'

// Mock Firebase Admin for auth
vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    verifySessionCookie: vi.fn().mockResolvedValue({
      uid: 'test-user-id',
      email: 'test@example.com'
    })
  })
}))

// Mock Stripe Service
vi.mock('../services/stripeService', () => ({
  getOrCreateCustomer: vi.fn(),
  createCheckoutSession: vi.fn(),
  createPortalSession: vi.fn(),
  handleWebhookEvent: vi.fn(),
  constructWebhookEvent: vi.fn(),
  getSubscriptionStatus: vi.fn()
}))

describe('Stripe Controller Integration Tests', () => {
  let mongoServer: MongoMemoryServer
  let testUserId: string
  let testUser: any
  let csrfToken: string
  let csrfCookies: string[] = []

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create()
    const mongoUri = mongoServer.getUri()

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect()
    }
    await mongoose.connect(mongoUri)
  })

  afterAll(async () => {
    await mongoose.disconnect()
    await mongoServer.stop()
  })

  beforeEach(async () => {
    await user.deleteMany({})

    // Create test user
    testUser = await user.create({
      _id: new mongoose.Types.ObjectId(),
      name: 'Test User',
      email: 'test@example.com',
      uid: 'test-user-id',
      stripeCustomerId: 'cus_123' // Default to having a customer ID
    })
    testUserId = testUser._id.toString()

    // Get CSRF Token
    const getRes = await request(app).get('/csrf-token')
    csrfToken = getRes.body.csrfToken
    csrfCookies = (getRes.headers['set-cookie'] as unknown as string[]) ?? []
    
    vi.clearAllMocks()
  })

  const authenticatedRequest = (method: 'get' | 'post', path: string): request.Test => {
    const req = request(app)[method](path)
    const allCookies = [...csrfCookies, 'session=mock-session-token'].join('; ')
    return req.set('Cookie', allCookies).set('x-csrf-token', csrfToken)
  }

  describe('POST /stripe/checkout', () => {
    it('should create checkout session successfully', async () => {
      vi.mocked(stripeService.getOrCreateCustomer).mockResolvedValue({ success: true, data: 'cus_123' })
      vi.mocked(stripeService.createCheckoutSession).mockResolvedValue({ success: true, data: 'https://checkout.url' })

      const response = await authenticatedRequest('post', '/stripe/checkout')
        .send({
            priceId: 'price_pro',
            successUrl: 'https://example.com/success',
            cancelUrl: 'https://example.com/cancel'
        })
        .expect(200)

      expect(response.body.url).toBe('https://checkout.url')
      expect(stripeService.getOrCreateCustomer).toHaveBeenCalled()
      expect(stripeService.createCheckoutSession).toHaveBeenCalledWith('cus_123', 'price_pro', 'https://example.com/success', 'https://example.com/cancel')
    })

    it('should return 400 for missing fields', async () => {
       const response = await authenticatedRequest('post', '/stripe/checkout')
        .send({
            priceId: 'price_pro'
            // missing urls
        })
        .expect(400)
    })
    
     it('should return 500 if service fails', async () => {
      vi.mocked(stripeService.getOrCreateCustomer).mockResolvedValue({ success: true, data: 'cus_123' })
      vi.mocked(stripeService.createCheckoutSession).mockResolvedValue({ success: false, error: 'Service error' })

      await authenticatedRequest('post', '/stripe/checkout')
        .send({
            priceId: 'price_pro',
            successUrl: 'https://example.com/success',
            cancelUrl: 'https://example.com/cancel'
        })
        .expect(500)
    })
  })

  describe('POST /stripe/portal', () => {
    it('should create portal session successfully', async () => {
      vi.mocked(stripeService.createPortalSession).mockResolvedValue({ success: true, data: 'https://portal.url' })

      const response = await authenticatedRequest('post', '/stripe/portal')
        .send({ returnUrl: 'https://example.com' })
        .expect(200)

      expect(response.body.url).toBe('https://portal.url')
      expect(stripeService.createPortalSession).toHaveBeenCalledWith('cus_123', 'https://example.com')
    })
    
    it('should return 400 if user has no stripe customer id', async () => {
         await user.updateOne({ _id: testUser._id }, { $unset: { stripeCustomerId: 1 } })
         
         await authenticatedRequest('post', '/stripe/portal')
            .send({ returnUrl: 'https://example.com' })
            .expect(400)
    })
  })

  describe('POST /stripe/webhook', () => {
    it('should handle webhook event successfully', async () => {
        // Webhooks don't use CSRF or session usually, but let's check parsing
        // We mock constructEvent to return a valid object
        const mockEvent = { type: 'checkout.session.completed', data: { object: {} } }
        vi.mocked(stripeService.constructWebhookEvent).mockReturnValue(mockEvent as any)
        vi.mocked(stripeService.handleWebhookEvent).mockResolvedValue({ success: true })

        await request(app)
            .post('/stripe/webhook')
            .set('stripe-signature', 'valid_sig')
            .send({ some: 'data' }) // Body matching what mock expects? constructWebhookEvent usually takes raw body
            .expect(200)
        
        expect(stripeService.handleWebhookEvent).toHaveBeenCalledWith(mockEvent)
    })

    it('should return 400 if signature is missing', async () => {
        await request(app)
            .post('/stripe/webhook')
            .send({})
            .expect(400)
    })
    
     it('should return 400 if signature is invalid', async () => {
         vi.mocked(stripeService.constructWebhookEvent).mockReturnValue(null)
         
         await request(app)
            .post('/stripe/webhook')
            .set('stripe-signature', 'invalid_sig')
            .send({})
            .expect(400)
     })
  })

  describe('GET /stripe/status', () => {
      it('should return subscription status', async () => {
          const mockStatus = {
              status: 'active',
              plan: 'PRO',
              cancelAtPeriodEnd: false,
              limits: { storageMB: 5000, llmCallsPerMonth: 500 },
              remainingQuota: 4000,
              llmCallsThisMonth: 10,
              llmCallsResetAt: new Date()
          }
          vi.mocked(stripeService.getSubscriptionStatus).mockResolvedValue({ success: true, data: mockStatus as any })

          const response = await authenticatedRequest('get', '/stripe/status')
            .expect(200)
          
          expect(response.body).toEqual(expect.objectContaining({
              status: 'active',
              plan: 'PRO'
          }))
      })
  })
})
