import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { globalErrorHandler } from '../errorHandler'
import {
  createCategoryBodySchema,
  deleteImageBodySchema
} from './validationSchemas'
import { validateBody, validateQuery } from './zodValidator'

// Crear una app de prueba sin middleware de autenticación
const testApp = express()
testApp.use(express.json())

// Esquema inline para getname (como está en las rutas reales)
const urlQuerySchema = z.object({
  url: z.string().url('URL inválida')
})

// Configurar rutas de prueba con solo validación (sin autenticación)
testApp.post('/categories',
  validateBody(createCategoryBodySchema),
  (req, res) => res.status(200).json({ status: 'success' })
)
testApp.get('/links/getname',
  validateQuery(urlQuerySchema),
  (req, res) => res.status(200).json({ status: 'success' })
)
testApp.delete('/storage/image',
  validateBody(deleteImageBodySchema),
  (req, res) => res.status(200).json({ status: 'success' })
)

// Agregar el middleware de manejo de errores al final
testApp.use(globalErrorHandler)

describe('Validación Zod Integration Tests', () => {
  describe('POST /categories', () => {
    it('debe rechazar datos inválidos con validación Zod', async () => {
      const invalidData = {
        name: '', // Nombre vacío debería fallar
        order: -1 // Orden negativo debería fallar
      }

      const response = await request(testApp)
        .post('/categories')
        .send(invalidData)

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        status: 'fail',
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: expect.stringContaining('body'),
            message: expect.any(String),
            code: expect.any(String)
          })
        ])
      })
    })

    it('debe aceptar datos válidos', async () => {
      const validData = {
        name: 'Categoría de prueba',
        parentId: 'parent123',
        order: 1,
        hidden: false
      }

      const response = await request(testApp)
        .post('/categories')
        .send(validData)

      // Debe ser 200 porque la validación pasa
      expect(response.status).toBe(200)
    })
  })

  describe('GET /links/getname', () => {
    it('debe validar parámetros de query', async () => {
      const response = await request(testApp)
        .get('/links/getname?url=invalid-url')

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        status: 'fail',
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'query.url',
            message: 'URL inválida'
          })
        ])
      })
    })

    it('debe aceptar URL válida', async () => {
      const response = await request(testApp)
        .get('/links/getname?url=https://example.com')

      // Debe ser 200 porque la validación pasa
      expect(response.status).toBe(200)
    })
  })

  describe('DELETE /storage/image', () => {
    it('debe validar datos de eliminación de imagenn', async () => {
      const invalidData = {
        foo: 'bar'
      }

      const response = await request(testApp)
        .delete('/storage/image')
        .set('Content-Type', 'application/json')
        .send(invalidData)

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        status: 'fail',
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'body.image',
            message: 'Required',
            code: 'invalid_type'
          })
        ])
      })
    })
  })
})
