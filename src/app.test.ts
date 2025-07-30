import request from 'supertest'
import app from './app'
import { describe, it, expect } from 'vitest'

describe('GET /health', () => {
  it('debe responder con status ok', async () => {
    const response = await request(app).get('/api/health')
    expect(response.status).toBe(200)
    expect(response.body.status).toBe('ok')
  })
})

describe('GET /links', () => {
  it('debe responder 401 en rutas protegidas sin sesión', async () => {
    const response = await request(app).get('/api/links')
    expect([401, 403]).toContain(response.status)
  })
})
describe('headers CORS', () => {
  it('debe incluir headers de CORS cuando se envía origin válido', async () => {
    const response = await request(app)
      .options('/links')
      .set('Origin', 'http://localhost:3000')
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000')
  })

  it('no debe incluir headers de CORS con origin inválido', async () => {
    const response = await request(app)
      .options('/links')
      .set('Origin', 'http://evil-site.com')
    expect(response.headers['access-control-allow-origin']).toBeUndefined()
  })
})
describe('GET /api/categories', () => {
  it('debe responder correctamente en /api/categories', async () => {
    const response = await request(app).get('/api/categories')
    expect([200, 401, 403]).toContain(response.status)
  })
})

describe('Rutas no existentes', () => {
  it('debe responder 404 en rutas no existentes', async () => {
    const response = await request(app).get('/ruta-inexistente')
    expect(response.status).toBe(404)
  })
})
