import { Schema, model } from 'mongoose'

const UsersSchema = new Schema({
  name: {
    type: String
  },
  realName: {
    type: String
  },
  email: {
    type: String,
    unique: true,
    index: true
  },
  password: {
    type: String
  },
  newUser: {
    type: Boolean
  },
  profileImage: {
    type: String
  },
  signMethod: {
    type: String
  },
  googleId: {
    type: String
  },
  website: {
    type: String
  },
  aboutMe: {
    type: String
  },
  lastBackupUrl: {
    type: String
  },
  stripeCustomerId: {
    type: String,
    index: true
  },
  subscription: {
    status: {
      type: String,
      enum: ['free', 'active', 'past_due', 'canceled'],
      default: 'free'
    },
    plan: {
      type: String,
      enum: ['FREE', 'PRO', 'ENTERPRISE'],
      default: 'FREE'
    },
    stripeSubscriptionId: {
      type: String
    },
    currentPeriodEnd: {
      type: Date
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false
    }
  },
  llmCallsThisMonth: {
    type: Number,
    default: 0
  },
  llmCallsResetAt: {
    type: Date
  },
  quota: {
    type: Number
  }
}, {
  timestamps: true,
  versionKey: false
})

export default model('users', UsersSchema)
