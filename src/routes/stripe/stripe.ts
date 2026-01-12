import { Router } from 'express'
import * as stripeController from '../../controllers/stripeController'
import { checkUserSession } from '../../middlewares/checkUserSession'
import { doubleCsrfProtection } from '../../middlewares/csrf'

export const stripeRouter = Router()

// Webhook route - NO CSRF, NO session (called by Stripe)
// Note: Raw body parsing is handled in app.ts
stripeRouter.post('/webhook', stripeController.handleWebhook)

// Protected routes - require CSRF and user session
stripeRouter.post('/checkout', doubleCsrfProtection, checkUserSession, stripeController.createCheckout)
stripeRouter.post('/portal', doubleCsrfProtection, checkUserSession, stripeController.createPortal)
stripeRouter.get('/status', doubleCsrfProtection, checkUserSession, stripeController.getStatus)
