import type { Request, Response, NextFunction } from 'express'

import { PLANS, type PlanName } from '../config/stripeConfig'
import type { User } from '../types/userModel.types'
import users from '../models/schemas/userSchema'

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

    // Check database for current calls
    const dbUser = await users.findOne({ email: user.email })
    if (dbUser == null) {
      res.status(401).json({ error: 'User not found' })
      return
    }

    const now = new Date()
    const resetAt = dbUser.llmCallsResetAt
    let currentCount = dbUser.llmCallsThisMonth ?? 0

    // Reset logic: if it's a new month, treat count as 0
    if (resetAt == null || now.getMonth() !== resetAt.getMonth() || now.getFullYear() !== resetAt.getFullYear()) {
      currentCount = 0
    }

    if (currentCount >= limit) {
      res.status(429).json({
        error: 'LLM call limit exceeded',
        message: `You have reached your monthly limit of ${limit} LLM calls. Upgrade your plan for more.`,
        limit,
        plan
      })
      return
    }
    console.log('Usuario tiene peticiones libres este mes')
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
    if (req.file === undefined || req.file === null) {
      next()
      return
    }
    const plan: PlanName = (user.subscription?.plan as PlanName) ?? 'FREE'
    const limitMB = PLANS[plan].limits.storageMB
    const currentQuotaMB = (user.quota ?? 0) / (1024 * 1024)
    console.log(user.quota)
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
    console.log('Usuario tiene espacio libre en storage', limitMB, currentQuotaMB)
    next()
  } catch (error) {
    console.error('Error checking storage limit:', error)
    next(error)
  }
}
