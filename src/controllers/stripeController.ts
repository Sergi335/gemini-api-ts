import type { Request, Response } from 'express'
import * as stripeService from '../services/stripeService'
import { createCheckoutSchema, createPortalSchema } from '../validation/stripeValidation'
import type { User } from '../types/userModel.types'

/**
 * POST /stripe/checkout
 * Creates a Stripe Checkout session
 */
export async function createCheckout (req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user?: User }).user
    if (user == null) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    // Validate request body
    const parsed = createCheckoutSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message })
      return
    }

    const { priceId, successUrl, cancelUrl } = parsed.data

    // Get or create customer
    const customerResult = await stripeService.getOrCreateCustomer(user)
    if (!customerResult.success || customerResult.data == null) {
      res.status(500).json({ error: customerResult.error })
      return
    }

    // Create checkout session
    const sessionResult = await stripeService.createCheckoutSession(
      customerResult.data,
      priceId,
      successUrl,
      cancelUrl
    )

    if (!sessionResult.success || sessionResult.data == null) {
      res.status(500).json({ error: sessionResult.error })
      return
    }

    res.json({ url: sessionResult.data })
  } catch (error) {
    console.error('Error in createCheckout:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * POST /stripe/portal
 * Creates a Stripe Customer Portal session
 */
export async function createPortal (req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user?: User }).user
    if (user == null) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    // Validate request body
    const parsed = createPortalSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message })
      return
    }

    const { returnUrl } = parsed.data

    // User must have a Stripe customer ID
    if (user.stripeCustomerId == null) {
      res.status(400).json({ error: 'No subscription found' })
      return
    }

    // Create portal session
    const sessionResult = await stripeService.createPortalSession(
      user.stripeCustomerId,
      returnUrl
    )

    if (!sessionResult.success || sessionResult.data == null) {
      res.status(500).json({ error: sessionResult.error })
      return
    }

    res.json({ url: sessionResult.data })
  } catch (error) {
    console.error('Error in createPortal:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * POST /stripe/webhook
 * Handles Stripe webhook events
 */
export async function handleWebhook (req: Request, res: Response): Promise<void> {
  try {
    const signature = req.headers['stripe-signature'] as string
    if (signature == null) {
      res.status(400).json({ error: 'Missing stripe-signature header' })
      return
    }

    // Construct event from raw body
    const event = stripeService.constructWebhookEvent(req.body, signature)
    if (event == null) {
      res.status(400).json({ error: 'Invalid webhook signature' })
      return
    }

    // Handle the event
    const result = await stripeService.handleWebhookEvent(event)
    if (!result.success) {
      res.status(500).json({ error: result.error })
      return
    }

    res.json({ received: true })
  } catch (error) {
    console.error('Error in handleWebhook:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * GET /stripe/status
 * Gets user subscription status
 */
export async function getStatus (req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user?: User }).user
    if (user == null) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const result = await stripeService.getSubscriptionStatus(user.email)
    if (!result.success) {
      res.status(500).json({ error: result.error })
      return
    }

    res.json(result.data)
  } catch (error) {
    console.error('Error in getStatus:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
