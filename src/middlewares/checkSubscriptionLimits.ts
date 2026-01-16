import type { Request, Response, NextFunction } from 'express'
import * as stripeService from '../services/stripeService'
import { PLANS, type PlanName } from '../config/stripeConfig'
import type { User } from '../types/userModel.types'

/**
 * Middleware to check LLM call limits based on subscription plan
 */
export async function checkLlmLimit (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = (req as Request & { user?: User }).user
    if (user == null) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const plan: PlanName = (user.subscription?.plan as PlanName) ?? 'FREE'
    const limit = PLANS[plan].limits.llmCallsPerMonth

    // -1 means unlimited
    if (limit === -1) {
      next()
      return
    }

    // Check current usage
    const result = await stripeService.incrementLlmCalls(user.email)
    if (!result.success) {
      res.status(429).json({
        error: 'LLM call limit exceeded',
        message: `You have reached your monthly limit of ${limit} LLM calls. Upgrade your plan for more.`,
        limit,
        plan
      })
      return
    }

    next()
  } catch (error) {
    console.error('Error checking LLM limit:', error)
    next(error)
  }
}

/**
 * Middleware to check storage limits based on subscription plan
 * Solo calcula si se ha sobrepasado el límite, no incrementa el contador
 */
export async function checkStorageLimit (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = (req as Request & { user?: User }).user
    if (user == null) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const plan: PlanName = (user.subscription?.plan as PlanName) ?? 'FREE'
    const limitMB = PLANS[plan].limits.storageMB
    const currentQuotaMB = (user.quota ?? 0) / (1024 * 1024)

    // Check if uploading would exceed limit
    // Note: Actual file size should be checked in the storage controller
    if (currentQuotaMB >= limitMB) {
      res.status(429).json({
        error: 'Storage limit exceeded',
        message: `You have reached your storage limit of ${limitMB} MB. Upgrade your plan for more storage.`,
        currentMB: currentQuotaMB,
        limitMB,
        plan
      })
      return
    }

    next()
  } catch (error) {
    console.error('Error checking storage limit:', error)
    next(error)
  }
}
