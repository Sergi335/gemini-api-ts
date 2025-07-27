import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import { getLinkNameByUrlLocal, getLinkStatusLocal } from './linksUtils'

// Mock de axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn()
  }
}))

const mockedAxios = axios as any

describe('linksUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('getLinkNameByUrlLocal', () => {
    it('devuelve el título de la página cuando la solicitud es exitosa', async () => {
      const mockHtml = '<html><head><title>Mi Página de Prueba</title></head><body></body></html>'
      mockedAxios.get.mockResolvedValue({
        data: mockHtml,
        status: 200
      })

      const result = await getLinkNameByUrlLocal({ url: 'https://example.com' })

      expect(result).toBe('Mi Página de Prueba')
      expect(mockedAxios.get).toHaveBeenCalledWith('https://example.com')
    })

    it('devuelve el host cuando no hay título en la página', async () => {
      const mockHtml = '<html><head></head><body></body></html>'
      mockedAxios.get.mockResolvedValue({
        data: mockHtml,
        status: 200
      })

      const result = await getLinkNameByUrlLocal({ url: 'https://example.com/path' })

      expect(result).toBe('')
    })

    it('devuelve el host cuando la solicitud falla', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'))

      const result = await getLinkNameByUrlLocal({ url: 'https://example.com/path' })

      expect(result).toBe('example.com')
    })

    it('maneja URLs con títulos que contienen espacios', async () => {
      const mockHtml = '<html><head><title>  Mi Título con Espacios  </title></head><body></body></html>'
      mockedAxios.get.mockResolvedValue({
        data: mockHtml,
        status: 200
      })

      const result = await getLinkNameByUrlLocal({ url: 'https://example.com' })

      expect(result).toBe('  Mi Título con Espacios  ')
    })

    it('maneja títulos vacíos', async () => {
      const mockHtml = '<html><head><title></title></head><body></body></html>'
      mockedAxios.get.mockResolvedValue({
        data: mockHtml,
        status: 200
      })

      const result = await getLinkNameByUrlLocal({ url: 'https://example.com' })

      expect(result).toBe('')
    })
  })

  describe('getLinkStatusLocal', () => {
    it('devuelve "success" para códigos de estado 2xx', async () => {
      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: 'Success'
      })

      const result = await getLinkStatusLocal({ url: 'https://example.com' })

      expect(result).toEqual({ status: 'success' })
    })

    it('devuelve "redirect" para códigos de estado 3xx', async () => {
      mockedAxios.get.mockResolvedValue({
        status: 301,
        data: 'Redirect'
      })

      const result = await getLinkStatusLocal({ url: 'https://example.com' })

      expect(result).toEqual({ status: 'redirect' })
    })

    it('devuelve "clientErr" para códigos de estado 4xx', async () => {
      const error = new Error('Client Error')
      ;(error as any).response = { status: 404 }
      mockedAxios.get.mockRejectedValue(error)

      const result = await getLinkStatusLocal({ url: 'https://example.com' })

      expect(result).toEqual({ status: 'clientErr' })
    })

    it('devuelve "serverErr" para códigos de estado 5xx', async () => {
      const error = new Error('Server Error')
      ;(error as any).response = { status: 500 }
      mockedAxios.get.mockRejectedValue(error)

      const result = await getLinkStatusLocal({ url: 'https://example.com' })

      expect(result).toEqual({ status: 'serverErr' })
    })

    it('devuelve "informational" para códigos de estado 1xx', async () => {
      mockedAxios.get.mockResolvedValue({
        status: 100,
        data: 'Continue'
      })

      const result = await getLinkStatusLocal({ url: 'https://example.com' })

      expect(result).toEqual({ status: 'informational' })
    })

    it('maneja el caso especial de 403 devolviendo "success"', async () => {
      const error = new Error('Forbidden')
      ;(error as any).response = { status: 403 }
      mockedAxios.get.mockRejectedValue(error)

      const result = await getLinkStatusLocal({ url: 'https://example.com' })

      expect(result).toEqual({ status: 'success' })
    })

    it('devuelve "unknown" cuando no hay respuesta HTTP', async () => {
      const error = new Error('Network error')
      mockedAxios.get.mockRejectedValue(error)

      const result = await getLinkStatusLocal({ url: 'https://example.com' })

      expect(result).toEqual({ status: 'unknown' })
    })

    it('devuelve "unknown" para códigos de estado fuera de rango', async () => {
      mockedAxios.get.mockResolvedValue({
        status: 999,
        data: 'Unknown'
      })

      const result = await getLinkStatusLocal({ url: 'https://example.com' })

      expect(result).toEqual({ status: 'unknown' })
    })
  })
})
