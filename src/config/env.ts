import dotenv from 'dotenv'

// Cargar variables de entorno una sola vez
dotenv.config()

export const getEnvOrThrow = (key: string): string => {
  const value = process.env[key]
  if (value === undefined || value === null || value === '') {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

export const getPrivateKeyOrThrow = (): string => {
  const key = process.env.FBADMIN_PRIVATE_KEY
  if (key === undefined || key === null || key === '') {
    throw new Error('Missing required environment variable: FBADMIN_PRIVATE_KEY')
  }
  try {
    return JSON.parse(key)
  } catch {
    return key
  }
}

// Exportar variables de entorno comunes para fácil acceso
export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: process.env.PORT ?? '3000'
}
