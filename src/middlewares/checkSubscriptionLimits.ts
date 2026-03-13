import type { Request, Response, NextFunction } from 'express'

import { PLANS, type PlanName } from '../config/stripeConfig'
import type { User } from '../types/userModel.types'
import { getAiAccessDecision } from '../services/stripeService'

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

    const aiAccess = await getAiAccessDecision(user.email)
    if (!aiAccess.success || aiAccess.data == null) {
      res.status(500).json({ error: aiAccess.error ?? 'Error checking AI access' })
      return
    }

    if (!aiAccess.data.allowed) {
      res.status(aiAccess.data.statusCode ?? 403).json({
        error: 'AI access denied',
        message: aiAccess.data.message,
        limit: aiAccess.data.limit,
        plan: aiAccess.data.plan
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
