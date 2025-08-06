import { Response } from 'express'
import { Types } from 'mongoose'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { categoryModel } from '../models/categoryModel'
import { RequestWithUser } from '../types/express'
import { categoriesController } from './categoriesController'

// Mock del categoryModel
vi.mock('../models/categoryModel')

const mockUserId = new Types.ObjectId().toHexString()

describe('categoriesController', () => {
  let mockRequest: Partial<RequestWithUser>
  let mockResponse: Partial<Response>

  beforeEach(() => {
    vi.clearAllMocks()

    mockRequest = {
      user: { _id: mockUserId, name: 'testuser' },
      body: {},
      params: {},
      query: {}
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
        { _id: 'cat1', name: 'Category 1', user: mockUserId },
        { _id: 'cat2', name: 'Category 2', user: mockUserId }
      ]

      vi.mocked(categoryModel.getAllCategories).mockResolvedValue(mockCategories as any)

      await categoriesController.getAllCategories(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(categoryModel.getAllCategories).toHaveBeenCalledWith({ userId: mockUserId })
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
    it('crea una categoría exitosamente', async () => {
      const newCategoryData = {
        name: 'New Category',
        parentId: 'parent123'
      }
      mockRequest.body = newCategoryData

      const mockCreatedCategory = {
        _id: 'newcat1',
        ...newCategoryData,
        user: mockUserId
      }

      vi.mocked(categoryModel.createCategory).mockResolvedValue([mockCreatedCategory] as any)

      await categoriesController.createCategory(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(categoryModel.createCategory).toHaveBeenCalledWith({
        userId: mockUserId,
        cleanData: { ...newCategoryData, user: mockUserId }
      })
      expect(mockResponse.status).toHaveBeenCalledWith(201)
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        category: [mockCreatedCategory]
      })
    })

    it('maneja errores del modelo durante la creación', async () => {
      const error = new Error('Database creation error')

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

  describe('updateCategory', () => {
    it('actualiza una categoría exitosamente', async () => {
      const updateData = { name: 'Updated Category' }
      // El controlador espera 'fields' y 'id' en el body
      mockRequest.body = { fields: updateData, id: 'cat123' }

      const mockUpdatedCategory = {
        _id: 'cat123',
        ...updateData,
        user: mockUserId
      }

      vi.mocked(categoryModel.updateCategory).mockResolvedValue(mockUpdatedCategory as any)

      await categoriesController.updateCategory(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(categoryModel.updateCategory).toHaveBeenCalledWith({
        userId: mockUserId,
        id: 'cat123',
        cleanData: updateData,
        elements: undefined
      })
      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        column: mockUpdatedCategory
      })
    })

    it('actualiza una categoría con elementos de ordenación', async () => {
      const updateData = { name: 'Updated Category' }
      // El controlador espera 'fields', 'id' y 'columnsIds' en el body
      mockRequest.body = { fields: updateData, id: 'cat123', columnsIds: ['col1', 'col2'] }

      const mockUpdatedCategory = { _id: 'cat123', ...updateData, user: mockUserId }
      vi.mocked(categoryModel.updateCategory).mockResolvedValue(mockUpdatedCategory as any)

      await categoriesController.updateCategory(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(categoryModel.updateCategory).toHaveBeenCalledWith({
        userId: mockUserId,
        id: 'cat123',
        cleanData: updateData,
        elements: ['col1', 'col2']
      })
    })
  })

  describe('deleteCategory', () => {
    it('elimina una categoría exitosamente', async () => {
      // El controlador espera 'id' en el body
      mockRequest.body = { id: 'cat123' }

      const mockDeletedCategory = {
        _id: 'cat123',
        name: 'Deleted Category',
        user: mockUserId
      }

      vi.mocked(categoryModel.deleteCategory).mockResolvedValue(mockDeletedCategory as any)

      await categoriesController.deleteCategory(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(categoryModel.deleteCategory).toHaveBeenCalledWith({
        id: 'cat123',
        userId: mockUserId
      })
      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        column: mockDeletedCategory
      })
    })
  })
})
