import Stripe from 'stripe'

if (process.env.STRIPE_SECRET_KEY === undefined) {
  throw new Error('STRIPE_SECRET_KEY is not defined')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-12-15.clover'
})

export type PlanName = 'FREE' | 'PRO' | 'ENTERPRISE'

export interface PlanLimits {
  storageMB: number
  llmCallsPerMonth: number // -1 = unlimited
}

export interface Plan {
  priceId: string | null
  limits: PlanLimits
}

export const PLANS: Record<PlanName, Plan> = {
  FREE: {
    priceId: null,
    limits: { storageMB: 50, llmCallsPerMonth: 20 }
  },
  PRO: {
    priceId: process.env.STRIPE_PRICE_ID_PRO ?? null,
    limits: { storageMB: 5120, llmCallsPerMonth: 500 }
  },
  ENTERPRISE: {
    priceId: process.env.STRIPE_PRICE_ID_ENTERPRISE ?? null,
    limits: { storageMB: 51200, llmCallsPerMonth: -1 } // -1 = unlimited
  }
}

export function getPlanByPriceId (priceId: string): PlanName | null {
  for (const [planName, plan] of Object.entries(PLANS)) {
    if (plan.priceId === priceId) {
      return planName as PlanName
    }
  }
  return null
}

export function getPlanLimits (planName: PlanName): PlanLimits {
  return PLANS[planName].limits
}
