import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import app from '../app'
import category from '../models/schemas/categorySchema'
import link from '../models/schemas/linkSchema'
import user from '../models/schemas/userSchema'

// Mock Firebase Admin para autenticación
vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    verifySessionCookie: vi.fn().mockResolvedValue({
      uid: 'test-user-id',
      email: 'test@example.com'
    })
  })
}))

describe('Categories Integration Tests', () => {
  let mongoServer: MongoMemoryServer
  let testUserId: string
  let testUser: any
  let csrfToken: string
  let csrfCookies: string[] = []

  beforeAll(async () => {
    // Inicializar MongoDB en memoria
    mongoServer = await MongoMemoryServer.create()
    const mongoUri = mongoServer.getUri()

    // Conectar Mongoose a la base de datos de prueba
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect()
    }
    await mongoose.connect(mongoUri)
  })

  afterAll(async () => {
    // Limpiar y cerrar conexiones
    await mongoose.disconnect()
    await mongoServer.stop()
  })

  beforeEach(async () => {
    // Limpiar base de datos antes de cada test
    await category.deleteMany({})
    await link.deleteMany({})
    await user.deleteMany({})

    // Crear usuario de prueba
    testUser = await user.create({
      _id: new mongoose.Types.ObjectId(),
      name: 'Test User',
      email: 'test@example.com',
      uid: 'test-user-id'
    })
    testUserId = testUser._id.toString()

    // Obtener CSRF token real
    const getRes = await request(app).get('/csrf-token')
    csrfToken = getRes.body.csrfToken
    csrfCookies = (getRes.headers['set-cookie'] as unknown as string[]) ?? []

    // Crear categorías de prueba
    await createTestCategories()
  })

  const createTestCategories = async (): Promise<any[]> => {
    const categories = [
      {
        name: 'Trabajo',
        slug: 'trabajo',
        level: 0,
        order: 0,
        user: testUserId,
        parentId: null,
        parentSlug: null
      },
      {
        name: 'Personal',
        slug: 'personal',
        level: 0,
        order: 1,
        user: testUserId,
        parentId: null,
        parentSlug: null
      },
      {
        name: 'Proyectos',
        slug: 'proyectos',
        level: 1,
        order: 0,
        user: testUserId,
        parentId: null, // Se actualizará después
        parentSlug: 'trabajo'
      },
      {
        name: 'Recursos',
        slug: 'recursos',
        level: 1,
        order: 1,
        user: testUserId,
        parentId: null, // Se actualizará después
        parentSlug: 'trabajo'
      }
    ]

    const createdCategories = await category.insertMany(categories)

    // Actualizar parentId para categorías hijas
    const trabajoCategory = createdCategories.find(cat => cat.slug === 'trabajo')
    if (trabajoCategory != null) {
      await category.updateMany(
        { parentSlug: 'trabajo', user: testUserId },
        { parentId: trabajoCategory._id.toString() }
      )
    }

    return createdCategories
  }

  // Helper para hacer requests autenticados
  const authenticatedRequest = (method: 'get' | 'post' | 'patch' | 'delete', path: string): request.Test => {
    const req = request(app)[method](path)
    const allCookies = [...csrfCookies, 'session=mock-session-token'].join('; ')
    return req.set('Cookie', allCookies).set('x-csrf-token', csrfToken)
  }

  describe('GET /categories', () => {
    it('debería retornar todas las categorías del usuario autenticado', async () => {
      const response = await authenticatedRequest('get', '/categories')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(4)
      expect(response.body.data[0]).toHaveProperty('name')
      expect(response.body.data[0]).toHaveProperty('slug')
      expect(response.body.data[0]).toHaveProperty('level')
    })

    it('debería retornar error para usuario no autenticado', async () => {
      const response = await request(app)
        .get('/categories')
        .expect(401)

      expect(response.body.error).toBe('No hay cookie de sesión')
    })

    it('debería retornar array vacío para usuario sin categorías', async () => {
      // Limpiar categorías del usuario de prueba
      await category.deleteMany({ user: testUserId })

      const response = await authenticatedRequest('get', '/categories')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toEqual({ error: 'No se encontraron categorías' })
    })
  })

  describe('GET /categories/toplevel', () => {
    it('debería retornar solo categorías de nivel 0', async () => {
      const response = await authenticatedRequest('get', '/categories/toplevel')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(2)
      expect(response.body.data.every((cat: any) => cat.level === 0)).toBe(true)
    })

    it('debería retornar categorías ordenadas por order', async () => {
      const response = await authenticatedRequest('get', '/categories/toplevel')
        .expect(200)

      const categories = response.body.data
      expect(categories[0].name).toBe('Trabajo')
      expect(categories[1].name).toBe('Personal')
    })
  })

  describe('POST /categories', () => {
    it('debería crear una nueva categoría válida', async () => {
      const newCategory = {
        name: 'Nueva Categoría',
        order: 2
      }

      const response = await authenticatedRequest('post', '/categories')
        .send(newCategory)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0].name).toBe('Nueva Categoría')
      expect(response.body.data[0].slug).toBe('nueva-categora')

      // Verificar en base de datos
      const dbCategory = await category.findOne({
        name: 'Nueva Categoría',
        user: testUserId
      })
      expect(dbCategory).not.toBeNull()
      expect(dbCategory?.slug).toBe('nueva-categora')
    })

    it('debería generar slug único para nombres duplicados', async () => {
      // Crear primera categoría
      const firstCategory = {
        name: 'Trabajo',
        level: 0,
        order: 3
      }

      const response = await authenticatedRequest('post', '/categories')
        .send(firstCategory)
        .expect(201)

      expect(response.body.data[0].slug).toBe('trabajo_1')

      // Verificar en base de datos
      const dbCategory = await category.findOne({
        slug: 'trabajo_1',
        user: testUserId
      })
      expect(dbCategory).not.toBeNull()
    })

    it('debería rechazar categoría sin nombre', async () => {
      const invalidCategory = {
        level: 0,
        order: 2
      }

      const response = await authenticatedRequest('post', '/categories')
        .send(invalidCategory)
        .expect(400)

      expect(response.body.status).toBe('fail')
    })

    it('debería crear categoría hija con parentId válido', async () => {
      const trabajoCategory = await category.findOne({ slug: 'trabajo', user: testUserId })

      const childCategory = {
        name: 'Subcategoría',
        order: 2,
        parentId: trabajoCategory?._id.toString()
      }

      const response = await authenticatedRequest('post', '/categories')
        .send(childCategory)
        .expect(201)

      expect(response.body.data[0].parentId).toBe(trabajoCategory?._id.toString())
      // Verificar en base de datos
      const dbCategory = await category.findOne({
        name: 'Subcategoría',
        user: testUserId
      })
      expect(dbCategory?.parentId?.toString()).toEqual(trabajoCategory?._id.toString())
    })
  })

  describe('PATCH /categories', () => {
    it('debería actualizar el nombre de una categoría', async () => {
      const trabajoCategory = await category.findOne({ slug: 'trabajo', user: testUserId })

      const updateData = {
        updates: [{
          id: trabajoCategory?._id.toString(),
          fields: {
            name: 'Trabajo Actualizado'
          }
        }]
      }

      const response = await authenticatedRequest('patch', '/categories')
        .send(updateData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data[0].name).toBe('Trabajo Actualizado')
      expect(response.body.data[0].slug).toBe('trabajo-actualizado')

      // Verificar en base de datos
      const dbCategory = await category.findById(trabajoCategory?._id)
      expect(dbCategory?.name).toBe('Trabajo Actualizado')
      expect(dbCategory?.slug).toBe('trabajo-actualizado')
    })

    it('debería mover categoría a otro padre', async () => {
      const proyectosCategory = await category.findOne({ slug: 'proyectos', user: testUserId })
      const personalCategory = await category.findOne({ slug: 'personal', user: testUserId })

      const updateData = {
        updates: [{
          id: proyectosCategory?._id.toString(),
          fields: {
            parentId: personalCategory?._id.toString(),
            parentSlug: 'personal'
          }
        }]
      }

      const response = await authenticatedRequest('patch', '/categories')
        .send(updateData)
        .expect(200)

      expect(response.body.success).toBe(true)

      // Verificar en base de datos
      const dbCategory = await category.findById(proyectosCategory?._id)
      expect(dbCategory?.parentId?.toString()).toBe(personalCategory?._id.toString())
      expect(dbCategory?.parentSlug).toBe('personal')
    })

    it('debería rechazar actualización con ID inexistente', async () => {
      const updateData = {
        updates: [{
          id: new mongoose.Types.ObjectId().toString(),
          fields: {
            name: 'No Existe'
          }
        }]
      }

      const response = await authenticatedRequest('patch', '/categories')
        .send(updateData)
        .expect(200)

      expect(response.body.data[0]).toEqual({ id: updateData.updates[0].id, error: 'La categoría no existe' })
    })
  })

  describe('DELETE /categories', () => {
    it('debería eliminar categoría y reordenar las restantes', async () => {
      const proyectosCategory = await category.findOne({ slug: 'proyectos', user: testUserId })

      const deleteData = {
        id: proyectosCategory?._id.toString(),
        level: 1
      }

      const response = await authenticatedRequest('delete', '/categories')
        .send(deleteData)
        .expect(200)

      expect(response.body.success).toBe(true)

      // Verificar eliminación en base de datos
      const dbCategory = await category.findById(proyectosCategory?._id)
      expect(dbCategory).toBeNull()

      // Verificar reordenamiento de categorías hermanas
      const remainingCategories = await category
        .find({ parentSlug: 'trabajo', user: testUserId })
        .sort({ order: 1 })

      expect(remainingCategories).toHaveLength(1)
      expect(remainingCategories[0].name).toBe('Recursos')
      expect(remainingCategories[0].order).toBe(0)
    })

    it('debería rechazar eliminación con ID inexistente', async () => {
      const deleteData = {
        id: new mongoose.Types.ObjectId().toString(),
        level: 1
      }

      const response = await authenticatedRequest('delete', '/categories')
        .send(deleteData)
        .expect(404)

      expect(response.body.error).toBe('Categoría no encontrada')
    })
  })

  describe('Flujos Complejos', () => {
    it('debería manejar flujo completo: crear, actualizar, eliminar', async () => {
      // 1. Crear nueva categoría
      const createResponse = await authenticatedRequest('post', '/categories')
        .send({
          name: 'Categoría Temporal',
          level: 0,
          order: 2
        })
        .expect(201)

      const newCategoryId = createResponse.body.data[0]._id

      // 2. Actualizar la categoría
      await authenticatedRequest('patch', '/categories')
        .send({
          updates: [{
            id: newCategoryId,
            fields: {
              name: 'Categoría Actualizada'
            }
          }]
        })
        .expect(200)

      // 3. Verificar actualización
      const dbCategory = await category.findById(newCategoryId)
      expect(dbCategory?.name).toBe('Categoría Actualizada')

      // 4. Eliminar la categoría
      await authenticatedRequest('delete', '/categories')
        .send({
          id: newCategoryId,
          level: 0
        })
        .expect(200)

      // 5. Verificar eliminación
      const deletedCategory = await category.findById(newCategoryId)
      expect(deletedCategory).toBeNull()
    })

    it('debería mantener integridad de datos con múltiples operaciones', async () => {
      // Contar categorías iniciales
      const initialCount = await category.countDocuments({ user: testUserId })
      expect(initialCount).toBe(4)

      // Crear múltiples categorías
      for (let i = 0; i < 3; i++) {
        await authenticatedRequest('post', '/categories')
          .send({
            name: `Test ${i}`,
            level: 0,
            order: i + 10
          })
          .expect(201)
      }

      // Verificar que se crearon correctamente
      const finalCount = await category.countDocuments({ user: testUserId })
      expect(finalCount).toBe(7)

      // Verificar que todas pertenecen al usuario correcto
      const userCategories = await category.find({ user: testUserId })
      expect(userCategories.every(cat => cat.user?.toString() === testUserId)).toBe(true)
    })
  })
})
