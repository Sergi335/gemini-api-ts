import Stripe from 'stripe'
import { stripe, getPlanByPriceId, PLANS, type PlanName } from '../config/stripeConfig'
import users from '../models/schemas/userSchema'
import type { User } from '../types/userModel.types'

export interface StripeServiceResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Gets or creates a Stripe customer for the user
 */
export async function getOrCreateCustomer (user: User): Promise<StripeServiceResult<string>> {
  try {
    // If user already has a Stripe customer ID, return it
    if (user.stripeCustomerId != null) {
      return { success: true, data: user.stripeCustomerId }
    }

    // Check database again to be sure (in case the user object is stale)
    const dbUser = await users.findOne({ email: user.email })
    if (dbUser?.stripeCustomerId != null) {
      return { success: true, data: dbUser.stripeCustomerId }
    }

    // Create a new Stripe customer
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name ?? user.realName ?? undefined,
      metadata: {
        userId: user._id ?? ''
      }
    })

    // Save the customer ID to the user
    await users.findOneAndUpdate(
      { email: user.email },
      { stripeCustomerId: customer.id }
    )

    return { success: true, data: customer.id }
  } catch (error) {
    console.error('Error creating Stripe customer:', error)
    return { success: false, error: 'Error creating Stripe customer' }
  }
}

/**
 * Creates a Stripe Checkout session for subscription
 */
export async function createCheckoutSession (
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<StripeServiceResult<string>> {
  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: {
          customerId
        }
      }
    })

    return { success: true, data: session.url ?? undefined }
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return { success: false, error: 'Error creating checkout session' }
  }
}

/**
 * Creates a Stripe Customer Portal session
 */
export async function createPortalSession (
  customerId: string,
  returnUrl: string
): Promise<StripeServiceResult<string>> {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl
    })

    return { success: true, data: session.url }
  } catch (error) {
    console.error('Error creating portal session:', error)
    return { success: false, error: 'Error creating portal session' }
  }
}

/**
 * Handles successful checkout completion
 */
async function handleCheckoutCompleted (session: Stripe.Checkout.Session): Promise<void> {
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string

  // Get the subscription to find the price
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const priceId = subscription.items.data[0]?.price.id
  const plan = priceId != null ? getPlanByPriceId(priceId) : 'PRO'

  // Access current_period_end from the subscription object
  const periodEnd = typeof subscription === 'object' && 'current_period_end' in subscription
    ? (subscription as { current_period_end: number }).current_period_end
    : Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 // Default to 30 days

  const cancelAtPeriodEnd = typeof subscription === 'object' && 'cancel_at_period_end' in subscription
    ? (subscription as { cancel_at_period_end: boolean }).cancel_at_period_end
    : false

  await users.findOneAndUpdate(
    { stripeCustomerId: customerId },
    {
      subscription: {
        status: 'active',
        plan: plan ?? 'PRO',
        stripeSubscriptionId: subscriptionId,
        currentPeriodEnd: new Date(periodEnd * 1000),
        cancelAtPeriodEnd
      }
    }
  )

  console.log(`Subscription activated for customer ${customerId}: ${plan ?? 'PRO'}`)
}

/**
 * Handles subscription updates
 */
async function handleSubscriptionUpdated (subscription: Stripe.Subscription): Promise<void> {
  const customerId = subscription.customer as string
  const priceId = subscription.items.data[0]?.price.id
  const plan = priceId != null ? getPlanByPriceId(priceId) : null

  let status: 'active' | 'past_due' | 'canceled' = 'active'
  if (subscription.status === 'past_due') {
    status = 'past_due'
  } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
    status = 'canceled'
  }

  // Access current_period_end from the subscription object
  const periodEnd = typeof subscription === 'object' && 'current_period_end' in subscription
    ? (subscription as unknown as { current_period_end: number }).current_period_end
    : Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60

  const cancelAtPeriodEnd = typeof subscription === 'object' && 'cancel_at_period_end' in subscription
    ? (subscription as unknown as { cancel_at_period_end: boolean }).cancel_at_period_end
    : false

  await users.findOneAndUpdate(
    { stripeCustomerId: customerId },
    {
      subscription: {
        status,
        plan: plan ?? 'FREE',
        stripeSubscriptionId: subscription.id,
        currentPeriodEnd: new Date(periodEnd * 1000),
        cancelAtPeriodEnd
      }
    }
  )

  console.log(`Subscription updated for customer ${customerId}: status=${status}, plan=${plan ?? 'FREE'}`)
}

/**
 * Handles subscription deletion
 */
async function handleSubscriptionDeleted (subscription: Stripe.Subscription): Promise<void> {
  const customerId = subscription.customer as string

  await users.findOneAndUpdate(
    { stripeCustomerId: customerId },
    {
      subscription: {
        status: 'free',
        plan: 'FREE',
        stripeSubscriptionId: undefined,
        currentPeriodEnd: undefined,
        cancelAtPeriodEnd: false
      }
    }
  )

  console.log(`Subscription canceled for customer ${customerId}, reverted to FREE`)
}

/**
 * Handles failed payment
 */
async function handlePaymentFailed (invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string

  await users.findOneAndUpdate(
    { stripeCustomerId: customerId },
    {
      'subscription.status': 'past_due'
    }
  )

  console.log(`Payment failed for customer ${customerId}`)
}

/**
 * Handles Stripe webhook events
 */
export async function handleWebhookEvent (event: Stripe.Event): Promise<StripeServiceResult> {
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        await handleCheckoutCompleted(session)
        break
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object
        await handleSubscriptionUpdated(subscription)
        break
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        await handleSubscriptionDeleted(subscription)
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object
        await handlePaymentFailed(invoice)
        break
      }
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return { success: true }
  } catch (error) {
    console.error('Error handling webhook event:', error)
    return { success: false, error: 'Error handling webhook event' }
  }
}

/**
 * Gets user subscription status
 */
export async function getSubscriptionStatus (email: string): Promise<StripeServiceResult<{
  status: string
  plan: PlanName
  currentPeriodEnd?: Date
  cancelAtPeriodEnd: boolean
  limits: { storageMB: number, llmCallsPerMonth: number }
}>> {
  try {
    const user = await users.findOne({ email })
    if (user == null) {
      return { success: false, error: 'User not found' }
    }

    const plan: PlanName = (user.subscription?.plan as PlanName) ?? 'FREE'
    const limits = PLANS[plan].limits

    return {
      success: true,
      data: {
        status: user.subscription?.status ?? 'free',
        plan,
        currentPeriodEnd: user.subscription?.currentPeriodEnd,
        cancelAtPeriodEnd: user.subscription?.cancelAtPeriodEnd ?? false,
        limits
      }
    }
  } catch (error) {
    console.error('Error getting subscription status:', error)
    return { success: false, error: 'Error getting subscription status' }
  }
}

/**
 * Increments LLM call count for the user
 */
export async function incrementLlmCalls (email: string): Promise<StripeServiceResult<{ count: number, limit: number }>> {
  try {
    const user = await users.findOne({ email })
    if (user == null) {
      return { success: false, error: 'User not found' }
    }

    const plan: PlanName = (user.subscription?.plan as PlanName) ?? 'FREE'
    const limit = PLANS[plan].limits.llmCallsPerMonth

    // Check if we need to reset the count (new month)
    const now = new Date()
    const resetAt = user.llmCallsResetAt
    let currentCount = user.llmCallsThisMonth ?? 0

    if (resetAt == null || now.getMonth() !== resetAt.getMonth() || now.getFullYear() !== resetAt.getFullYear()) {
      // Reset count for new month
      currentCount = 0
    }

    // Check limit (-1 means unlimited)
    if (limit !== -1 && currentCount >= limit) {
      return { success: false, error: 'LLM call limit exceeded' }
    }

    // Increment count
    const newCount = currentCount + 1
    await users.findOneAndUpdate(
      { email },
      {
        llmCallsThisMonth: newCount,
        llmCallsResetAt: now
      }
    )

    return { success: true, data: { count: newCount, limit } }
  } catch (error) {
    console.error('Error incrementing LLM calls:', error)
    return { success: false, error: 'Error incrementing LLM calls' }
  }
}

/**
 * Verifies Stripe webhook signature
 */
export function constructWebhookEvent (payload: Buffer, signature: string): Stripe.Event | null {
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (webhookSecret == null) {
      console.error('STRIPE_WEBHOOK_SECRET is not defined')
      return null
    }

    return stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return null
  }
}
