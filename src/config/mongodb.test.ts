import 'dotenv/config'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock de mongoose.connect para evitar conexiones reales
const connectMock = vi.fn()
vi.mock('mongoose', () => ({
  default: { connect: connectMock }
}))

// Guarda el entorno original para restaurarlo después de cada test
const OLD_ENV = process.env

beforeEach(() => {
  vi.clearAllMocks() // Limpia los mocks antes de cada test
  process.env = { ...OLD_ENV } // Restaura las variables de entorno originales
})

afterEach(() => {
  process.env = OLD_ENV // Restaura el entorno después de cada test
})

describe('dbConnect', () => {
  it('usa DB_URI si NODE_ENV no es test', async () => {
    // Simula entorno de desarrollo
    process.env.NODE_ENV = 'development'
    connectMock.mockResolvedValueOnce(undefined) // Simula conexión exitosa
    const { dbConnect } = await import('./mongodb')
    await dbConnect()
    // Verifica que se use la URI de desarrollo
    expect(connectMock).toHaveBeenCalledWith(process.env.DB_URI)
  })

  it('usa DB_URI_TEST si NODE_ENV es test', async () => {
    // Simula entorno de test
    process.env.NODE_ENV = 'test'
    connectMock.mockResolvedValueOnce(undefined) // Simula conexión exitosa
    const { dbConnect } = await import('./mongodb')
    await dbConnect()
    // Verifica que se use la URI de test
    expect(connectMock).toHaveBeenCalledWith(process.env.DB_URI_TEST)
  })

  it('lanza error si no hay cadena de conexión', async () => {
    // Simula entorno sin cadena de conexión
    process.env.NODE_ENV = 'production'
    delete process.env.DB_URI
    const { dbConnect } = await import('./mongodb')
    // Verifica que lanza el error esperado
    await expect(dbConnect()).rejects.toThrow('No se ha definido la cadena de conexión a la base de datos')
  })

  it('muestra mensaje de conexión correcta en consola', async () => {
    // Simula conexión exitosa y espía el log
    process.env.NODE_ENV = 'development'
    connectMock.mockResolvedValueOnce(undefined)
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { dbConnect } = await import('./mongodb')
    await dbConnect()
    // Verifica que se muestra el mensaje de éxito
    expect(logSpy).toHaveBeenCalledWith('***** CONEXION CORRECTA *****')
    logSpy.mockRestore()
  })

  it('muestra mensaje de error en consola si la conexión falla', async () => {
    // Simula fallo de conexión y espía el log
    process.env.NODE_ENV = 'development'
    const error = new Error('fail')
    connectMock.mockRejectedValueOnce(error)
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { dbConnect } = await import('./mongodb')
    // Espera a que la promesa rechazada se maneje y verifica el mensaje de error
    await expect(dbConnect()).resolves.toBeUndefined()
    expect(logSpy).toHaveBeenCalledWith('***** ERROR DE CONEXION *****', error)
    logSpy.mockRestore()
  })
})
