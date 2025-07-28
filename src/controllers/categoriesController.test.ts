import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Request, Response } from 'express'
import { categoriesController } from './categoriesController'
import { categoryModel } from '../models/categoryModel'
import { validateCreateCategory, validateUpdateCategory } from '../validation/categoriesZodSchema'

// Mock del categoryModel
vi.mock('../models/categoryModel')

// Mock de las validaciones
vi.mock('../validation/categoriesZodSchema')

// Tipos para el mock
interface User {
  name: string
}

interface RequestWithUser extends Request {
  user?: User
}

describe('categoriesController', () => {
  let mockRequest: Partial<RequestWithUser>
  let mockResponse: Partial<Response>

  beforeEach(() => {
    vi.clearAllMocks()

    mockRequest = {
      user: { name: 'testuser' },
      body: {}
    }

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis()
    }
  })

  describe('getAllCategories', () => {
    it('devuelve todas las categorías exitosamente', async () => {
      const mockCategories = [
        { _id: 'cat1', name: 'Category 1', user: 'testuser' },
        { _id: 'cat2', name: 'Category 2', user: 'testuser' }
      ]

      vi.mocked(categoryModel.getAllCategories).mockResolvedValue(mockCategories as any)

      await categoriesController.getAllCategories(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(categoryModel.getAllCategories).toHaveBeenCalledWith({ user: 'testuser' })
      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockCategories
      })
    })

    it('maneja errores del modelo', async () => {
      const error = new Error('Database error')
      vi.mocked(categoryModel.getAllCategories).mockRejectedValue(error)

      await categoriesController.getAllCategories(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.send).toHaveBeenCalledWith({
        status: 'fail',
        error
      })
    })
  })

  describe('createCategory', () => {
    beforeEach(() => {
      mockRequest.body = {
        name: 'New Category',
        parentId: 'parent123'
      }
    })

    it('crea una categoría exitosamente', async () => {
      const mockValidationResult = {
        success: true,
        data: {
          name: 'New Category',
          parentId: 'parent123',
          user: 'testuser'
        }
      }

      const mockCreatedCategory = {
        _id: 'newcat1',
        name: 'New Category',
        parentId: 'parent123',
        user: 'testuser'
      }

      vi.mocked(validateCreateCategory).mockReturnValue(mockValidationResult as any)
      vi.mocked(categoryModel.createCategory).mockResolvedValue([mockCreatedCategory] as any)

      await categoriesController.createCategory(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(validateCreateCategory).toHaveBeenCalledWith({
        name: 'New Category',
        parentId: 'parent123',
        user: 'testuser'
      })
      expect(categoryModel.createCategory).toHaveBeenCalledWith({
        user: 'testuser',
        cleanData: mockValidationResult.data
      })
      expect(mockResponse.status).toHaveBeenCalledWith(201)
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        category: [mockCreatedCategory]
      })
    })

    it('devuelve error cuando la validación falla', async () => {
      const mockValidationResult = {
        success: false,
        error: {
          issues: [
            { message: 'Name is required' },
            { message: 'ParentId is required' }
          ]
        }
      }

      vi.mocked(validateCreateCategory).mockReturnValue(mockValidationResult as any)

      await categoriesController.createCategory(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'fail',
        message: ['Name is required', 'ParentId is required']
      })
      expect(categoryModel.createCategory).not.toHaveBeenCalled()
    })

    it('maneja errores del modelo durante la creación', async () => {
      const mockValidationResult = {
        success: true,
        data: {
          name: 'New Category',
          parentId: 'parent123',
          user: 'testuser'
        }
      }

      const error = new Error('Database creation error')

      vi.mocked(validateCreateCategory).mockReturnValue(mockValidationResult as any)
      vi.mocked(categoryModel.createCategory).mockRejectedValue(error)

      await categoriesController.createCategory(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.send).toHaveBeenCalledWith({
        status: 'fail',
        error
      })
    })
  })

  describe('updateColumn', () => {
    beforeEach(() => {
      mockRequest.body = {
        fields: {
          name: 'Updated Category',
          order: 5
        },
        id: 'cat123'
      }
    })

    it('actualiza una categoría exitosamente', async () => {
      const mockValidationResult = {
        success: true,
        data: {
          name: 'Updated Category',
          order: 5
        }
      }

      const mockUpdatedCategory = {
        _id: 'cat123',
        name: 'Updated Category',
        order: 5,
        user: 'testuser'
      }

      vi.mocked(validateUpdateCategory).mockReturnValue(mockValidationResult as any)
      vi.mocked(categoryModel.updateCategory).mockResolvedValue(mockUpdatedCategory as any)

      await categoriesController.updateCategory(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(validateUpdateCategory).toHaveBeenCalledWith({
        name: 'Updated Category',
        order: 5
      })
      expect(categoryModel.updateCategory).toHaveBeenCalledWith({
        user: 'testuser',
        id: 'cat123',
        cleanData: mockValidationResult.data,
        elements: undefined
      })
      expect(mockResponse.status).toHaveBeenCalledWith(201)
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        column: mockUpdatedCategory
      })
    })

    it('actualiza una categoría con elementos de ordenación', async () => {
      mockRequest.body.columnsIds = ['col1', 'col2', 'col3']

      const mockValidationResult = {
        success: true,
        data: {
          name: 'Updated Category',
          order: 5
        }
      }

      const mockUpdatedCategory = {
        _id: 'cat123',
        name: 'Updated Category',
        order: 5,
        user: 'testuser'
      }

      vi.mocked(validateUpdateCategory).mockReturnValue(mockValidationResult as any)
      vi.mocked(categoryModel.updateCategory).mockResolvedValue(mockUpdatedCategory as any)

      await categoriesController.updateCategory(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(categoryModel.updateCategory).toHaveBeenCalledWith({
        user: 'testuser',
        id: 'cat123',
        cleanData: mockValidationResult.data,
        elements: ['col1', 'col2', 'col3']
      })
    })

    it('devuelve error cuando la validación falla', async () => {
      const mockValidationResult = {
        success: false,
        error: {
          issues: [
            { message: 'Order must be a number' }
          ]
        }
      }

      vi.mocked(validateUpdateCategory).mockReturnValue(mockValidationResult as any)

      await categoriesController.updateCategory(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'fail',
        message: ['Order must be a number']
      })
      expect(categoryModel.updateCategory).not.toHaveBeenCalled()
    })

    it('maneja errores del modelo durante la actualización', async () => {
      const mockValidationResult = {
        success: true,
        data: {
          name: 'Updated Category',
          order: 5
        }
      }

      const error = new Error('Database update error')

      vi.mocked(validateUpdateCategory).mockReturnValue(mockValidationResult as any)
      vi.mocked(categoryModel.updateCategory).mockRejectedValue(error)

      await categoriesController.updateCategory(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.send).toHaveBeenCalledWith({
        status: 'fail',
        error
      })
    })
  })

  describe('deleteColumn', () => {
    beforeEach(() => {
      mockRequest.body = {
        id: 'cat123'
      }
    })

    it('elimina una categoría exitosamente', async () => {
      const mockDeletedCategory = {
        _id: 'cat123',
        name: 'Deleted Category',
        user: 'testuser'
      }

      vi.mocked(categoryModel.deleteCategory).mockResolvedValue(mockDeletedCategory as any)

      await categoriesController.deleteCategory(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(categoryModel.deleteCategory).toHaveBeenCalledWith({
        id: 'cat123',
        user: 'testuser'
      })
      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        column: mockDeletedCategory
      })
    })

    it('maneja errores del modelo durante la eliminación', async () => {
      const error = new Error('Database delete error')

      vi.mocked(categoryModel.deleteCategory).mockRejectedValue(error)

      await categoriesController.deleteCategory(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.send).toHaveBeenCalledWith({
        status: 'fail',
        error
      })
    })
  })

  describe('Edge cases', () => {
    it('maneja el caso donde columnsIds es null', async () => {
      mockRequest.body = {
        fields: { name: 'Test' },
        id: 'cat123',
        columnsIds: null
      }

      const mockValidationResult = {
        success: true,
        data: { name: 'Test' }
      }

      vi.mocked(validateUpdateCategory).mockReturnValue(mockValidationResult as any)
      vi.mocked(categoryModel.updateCategory).mockResolvedValue({} as any)

      await categoriesController.updateCategory(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(categoryModel.updateCategory).toHaveBeenCalledWith({
        user: 'testuser',
        id: 'cat123',
        cleanData: { name: 'Test' },
        elements: undefined
      })
    })

    it('maneja el caso donde columnsIds es undefined', async () => {
      mockRequest.body = {
        fields: { name: 'Test' },
        id: 'cat123'
        // columnsIds no está definido
      }

      const mockValidationResult = {
        success: true,
        data: { name: 'Test' }
      }

      vi.mocked(validateUpdateCategory).mockReturnValue(mockValidationResult as any)
      vi.mocked(categoryModel.updateCategory).mockResolvedValue({} as any)

      await categoriesController.updateCategory(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(categoryModel.updateCategory).toHaveBeenCalledWith({
        user: 'testuser',
        id: 'cat123',
        cleanData: { name: 'Test' },
        elements: undefined
      })
    })
  })
})
