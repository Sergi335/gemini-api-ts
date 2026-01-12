export type SubscriptionStatus = 'free' | 'active' | 'past_due' | 'canceled'
export type PlanName = 'FREE' | 'PRO' | 'ENTERPRISE'

export interface Subscription {
  status: SubscriptionStatus
  plan: PlanName
  stripeSubscriptionId?: string
  currentPeriodEnd?: Date
  cancelAtPeriodEnd: boolean
}

export interface User {
  readonly _id?: string
  email: string
  name?: string
  quota?: number
  profileImage?: string
  realName?: string
  newUser?: boolean
  signMethod?: string
  googleId?: string
  webSite?: string
  aboutMe?: string
  lastBackupUrl?: string
  stripeCustomerId?: string
  subscription?: Subscription
  llmCallsThisMonth?: number
  llmCallsResetAt?: Date
}

export interface UserUpdateFields {
  email: string
  fields: Partial<User>
}
