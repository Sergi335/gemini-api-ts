import { describe, it, expect } from 'vitest'
import {
  validateCategory,
  validateCreateCategory,
  validateUpdateCategory,
  validatePartialCategory,
  type CategorySchema,
  type CreateCategorySchema,
  type UpdateCategorySchema
} from './categoriesZodSchema'

describe('categoriesZodSchema', () => {
  describe('validateCreateCategory', () => {
    it('valida correctamente una categoría para crear', () => {
      const validCategory = {
        name: 'Test Category',
        user: 'testuser',
        parentId: 'parent123'
      }

      const result = validateCreateCategory(validCategory)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Test Category')
        expect(result.data.user).toBe('testuser')
        expect(result.data.parentId).toBe('parent123')
      }
    })

    it('falla cuando faltan campos requeridos', () => {
      const invalidCategory = {
        name: 'Test Category'
        // Faltan user y parentId
      }

      const result = validateCreateCategory(invalidCategory)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues).toHaveLength(2)
        expect(result.error.issues.some(issue => issue.path.includes('user'))).toBe(true)
        expect(result.error.issues.some(issue => issue.path.includes('parentId'))).toBe(true)
      }
    })

    it('falla cuando el nombre está vacío', () => {
      const invalidCategory = {
        name: '',
        user: 'testuser',
        parentId: 'parent123'
      }

      const result = validateCreateCategory(invalidCategory)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(issue =>
          issue.path.includes('name') && issue.message.includes('at least 1 character')
        )).toBe(true)
      }
    })
  })

  describe('validateUpdateCategory', () => {
    it('valida correctamente una categoría para actualizar', () => {
      const validUpdate = {
        name: 'Updated Category',
        order: 5,
        hidden: true
      }

      const result = validateUpdateCategory(validUpdate)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Updated Category')
        expect(result.data.order).toBe(5)
        expect(result.data.hidden).toBe(true)
      }
    })

    it('permite campos opcionales', () => {
      const partialUpdate = {
        name: 'Just Name'
      }

      const result = validateUpdateCategory(partialUpdate)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Just Name')
      }
    })

    it('falla con tipos incorrectos', () => {
      const invalidUpdate = {
        name: 123, // Debería ser string
        order: 'not a number', // Debería ser number
        hidden: 'not a boolean' // Debería ser boolean
      }

      const result = validateUpdateCategory(invalidUpdate)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0)
      }
    })
  })

  describe('validateCategory', () => {
    it('valida una categoría completa', () => {
      const fullCategory = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Full Category',
        parentId: 'parent123',
        isEmpty: false,
        order: 1,
        user: 'testuser',
        slug: 'full-category',
        hidden: false,
        displayName: 'Full Category Display'
      }

      const result = validateCategory(fullCategory)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Full Category')
        expect(result.data.user).toBe('testuser')
        expect(result.data.slug).toBe('full-category')
      }
    })
  })

  describe('validatePartialCategory', () => {
    it('permite validación parcial', () => {
      const partialCategory = {
        name: 'Partial Name'
      }

      const result = validatePartialCategory(partialCategory)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Partial Name')
      }
    })

    it('permite objeto vacío', () => {
      const emptyCategory = {}

      const result = validatePartialCategory(emptyCategory)

      expect(result.success).toBe(true)
    })
  })

  describe('Type inference', () => {
    it('infiere tipos correctamente', () => {
      // Esto es más una verificación de tipos en tiempo de compilación
      const createData: CreateCategorySchema = {
        name: 'Test',
        user: 'user',
        parentId: 'parent'
      }

      const updateData: UpdateCategorySchema = {
        name: 'Updated',
        order: 1
      }

      const fullData: CategorySchema = {
        name: 'Full',
        user: 'user',
        parentId: 'parent',
        order: 1,
        hidden: false
      }

      expect(createData.name).toBe('Test')
      expect(updateData.name).toBe('Updated')
      expect(fullData.name).toBe('Full')
    })
  })
})
