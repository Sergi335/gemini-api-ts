// Setup global para tests de integración
import { vi } from 'vitest'

// Mock global de Firebase Admin
vi.mock('firebase-admin', () => ({
  default: {
    auth: () => ({
      verifyIdToken: vi.fn()
    }),
    credential: {
      cert: vi.fn()
    },
    initializeApp: vi.fn()
  }
}))

// Variables de entorno para testing
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-secret'
process.env.FIREBASE_PROJECT_ID = 'test-project'
