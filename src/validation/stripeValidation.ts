import { z } from 'zod'

export const createCheckoutSchema = z.object({
  priceId: z.string().min(1, 'priceId is required'),
  successUrl: z.string().url('successUrl must be a valid URL'),
  cancelUrl: z.string().url('cancelUrl must be a valid URL')
})

export const createPortalSchema = z.object({
  returnUrl: z.string().url('returnUrl must be a valid URL')
})

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>
export type CreatePortalInput = z.infer<typeof createPortalSchema>
