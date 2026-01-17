import { Response } from 'express'
import { Types } from 'mongoose'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { categoryModel } from '../models/categoryModel'
import { RequestWithUser } from '../types/express'
import { constants } from '../utils/constants'
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
      user: { _id: mockUserId, email: 'test@example.com', name: 'testuser' },
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

  describe('updateCategory - validaciones y errores', () => {
    it('devuelve 401 si el usuario no está autenticado', async () => {
      mockRequest.user = undefined
      mockRequest.body = { updates: [{ id: 'cat123', name: 'Updated Category' }] }

      await categoriesController.updateCategory(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        ...constants.API_FAIL_RESPONSE,
        error: constants.API_NOT_USER_MESSAGE
      })
    })

    it('devuelve 400 si updates es un array vacío', async () => {
      mockRequest.user = { _id: mockUserId, email: 'test@example.com', name: 'testuser' }
      mockRequest.body = { updates: [] }

      await categoriesController.updateCategory(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith({
        ...constants.API_FAIL_RESPONSE,
        error: 'Invalid updates array'
      })
    })

    it('devuelve 404 si la categoría no existe', async () => {
      vi.mocked(categoryModel.updateCategory).mockResolvedValueOnce({ error: 'La categoría no existe' })
      mockRequest.user = { _id: mockUserId, email: 'test@example.com', name: 'testuser' }
      mockRequest.body = { updates: [{ id: 'cat999', name: 'No existe' }] }

      await categoriesController.updateCategory(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith({
        ...constants.API_SUCCESS_RESPONSE,
        data: { error: 'La categoría no existe' }
      })
    })

    it('devuelve 500 si el modelo lanza una excepción', async () => {
      vi.mocked(categoryModel.updateCategory).mockRejectedValueOnce(new Error('Error inesperado'))
      mockRequest.user = { _id: mockUserId, email: 'test@example.com', name: 'testuser' }
      mockRequest.body = { updates: [{ id: 'cat123', name: 'Updated Category' }] }

      await categoriesController.updateCategory(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.json).toHaveBeenCalledWith({
        ...constants.API_FAIL_RESPONSE,
        error: 'Error inesperado'
      })
    })

    it('devuelve 200 y un array con errores si alguna categoría no existe', async () => {
      const results = [
        { id: 'cat999', error: 'La categoría no existe' },
        { id: 'cat123', name: 'Actualizada' }
      ]
      vi.mocked(categoryModel.updateCategory).mockResolvedValueOnce(results as any)
      mockRequest.user = { _id: mockUserId, email: 'test@example.com', name: 'testuser' }
      mockRequest.body = { updates: [{ id: 'cat999', name: 'No existe' }, { id: 'cat123', name: 'Actualizada' }] }

      await categoriesController.updateCategory(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith({
        ...constants.API_SUCCESS_RESPONSE,
        data: results
      })
    })
  })

  describe('deleteCategory - casos límite y errores', () => {
    it('devuelve 404 si la categoría a eliminar no existe', async () => {
      vi.mocked(categoryModel.deleteCategory).mockResolvedValueOnce({ error: 'No existe' })
      mockRequest.user = { _id: mockUserId, email: 'test@example.com', name: 'testuser' }
      mockRequest.body = { id: 'cat999' }

      await categoriesController.deleteCategory(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(mockResponse.status).toHaveBeenCalledWith(404)
      expect(mockResponse.json).toHaveBeenCalledWith({
        ...constants.API_FAIL_RESPONSE,
        error: 'Categoría no encontrada'
      })
    })

    it('devuelve 401 si el usuario no está autenticado', async () => {
      mockRequest.user = undefined
      mockRequest.body = { id: 'cat123' }

      await categoriesController.deleteCategory(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        ...constants.API_FAIL_RESPONSE,
        error: constants.API_NOT_USER_MESSAGE
      })
    })
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

      expect(categoryModel.getAllCategories).toHaveBeenCalledWith({ user: mockUserId })
      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith({
        ...constants.API_SUCCESS_RESPONSE,
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
      expect(mockResponse.json).toHaveBeenCalledWith({
        ...constants.API_FAIL_RESPONSE
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
        user: mockUserId,
        fields: { ...newCategoryData }
      })
      expect(mockResponse.status).toHaveBeenCalledWith(201)
      expect(mockResponse.json).toHaveBeenCalledWith({
        ...constants.API_SUCCESS_RESPONSE,
        data: [mockCreatedCategory]
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
      expect(mockResponse.json).toHaveBeenCalledWith({
        ...constants.API_FAIL_RESPONSE
      })
    })
  })

  describe('updateCategory', () => {
    it('actualiza una categoría exitosamente', async () => {
      const updateData = { name: 'Updated Category' }
      mockRequest.body = { updates: [{ ...updateData, id: 'cat123' }] }

      const mockUpdatedCategory = [
        {
          _id: 'cat123',
          ...updateData,
          user: mockUserId
        }
      ]

      vi.mocked(categoryModel.updateCategory).mockResolvedValue(mockUpdatedCategory as any)

      await categoriesController.updateCategory(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(categoryModel.updateCategory).toHaveBeenCalledWith({
        updates: [
          {
            user: mockUserId,
            id: 'cat123',
            fields: {
              name: updateData.name
            }
          }
        ]
      })
      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith({
        ...constants.API_SUCCESS_RESPONSE,
        data: mockUpdatedCategory
      })
    })
  })

  describe('deleteCategory', () => {
    it('elimina una categoría exitosamente', async () => {
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
        user: mockUserId,
        level: undefined
      })
      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith({
        ...constants.API_SUCCESS_RESPONSE,
        data: mockDeletedCategory
      })
    })
  })
})
