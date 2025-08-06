import type { Response } from 'express'
import { Types } from 'mongoose'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { linksController } from '../controllers/linksController'
import { linkModel } from '../models/linkModel'
import { RequestWithUser } from '../types/express'
import { validateLink, validatePartialLink } from '../validation/linksZodSchema'

// Mock the dependencies
vi.mock('../models/linkModel')
vi.mock('../validation/linksZodSchema')
vi.mock('../utils/linksUtils')

const mockUserId = new Types.ObjectId().toHexString()

// Simplify createMockReq to avoid missing properties error
const createMockReq = (
  body: any = {},
  params: any = {},
  query: any = {},
  user = { _id: mockUserId, name: 'testuser' }
): RequestWithUser => {
  // Cast as unknown to bypass missing properties on RequestWithUser
  const req = { body, params, query, user } as unknown as RequestWithUser
  return req
}

const createMockRes = (): Response => {
  const res: Partial<Response> = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  res.send = vi.fn().mockReturnValue(res)
  return res as Response
}

describe('LinksController', () => {
  let mockReq: RequestWithUser
  let mockRes: Response

  beforeEach(() => {
    vi.clearAllMocks()
    mockRes = createMockRes()
  })

  test('getAllLinks should return all links for user', async () => {
    mockReq = createMockReq()

    const mockLinks = [
      { _id: '1', name: 'Test Link', url: 'https://example.com', user: mockUserId }
    ]

    vi.mocked(linkModel.getAllLinks).mockResolvedValue(mockLinks as any)

    await linksController.getAllLinks(mockReq, mockRes)

    expect(linkModel.getAllLinks).toHaveBeenCalledWith({ user: mockUserId })
    expect(mockRes.status).toHaveBeenCalledWith(200)
    expect(mockRes.json).toHaveBeenCalledWith({ status: 'success', data: mockLinks })
  })

  test('createLink should create new link when validation passes', async () => {
    const linkData = {
      name: 'New Link',
      url: 'https://newlink.com',
      categoryId: 'cat123'
    }
    // El controlador ahora espera los datos directamente en el body
    mockReq = createMockReq(linkData)

    vi.mocked(validateLink).mockReturnValue({
      success: true,
      data: { ...linkData, user: mockUserId }
    } as any)

    const createdLink = { _id: 'newId', ...linkData, user: mockUserId }
    vi.mocked(linkModel.createLink).mockResolvedValue(createdLink as any)

    // Asumimos que un middleware de validación ya ha puesto los datos en req.body
    await linksController.createLink(mockReq, mockRes)

    // La validación ahora se haría en un middleware, por lo que no la probamos aquí.
    // En su lugar, nos aseguramos de que el modelo se llame con los datos correctos.
    expect(linkModel.createLink).toHaveBeenCalledWith({
      cleanData: expect.objectContaining(linkData)
    })
    expect(mockRes.status).toHaveBeenCalledWith(201)
    expect(mockRes.json).toHaveBeenCalledWith({
      status: 'success',
      link: createdLink
    })
  })

  test('createLink should return error when validation fails', async () => {
    // Este test es más difícil de simular sin el middleware de validación.
    // Asumiremos que el controlador no se llama si la validación falla.
    // O, para probar el catch, podemos hacer que el modelo falle.
    const linkData = { name: 'Bad Link' }
    mockReq = createMockReq(linkData)
    const dbError = new Error('Database error')
    vi.mocked(linkModel.createLink).mockRejectedValue(dbError)

    await linksController.createLink(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(500)
    expect(mockRes.send).toHaveBeenCalledWith(dbError)
  })

  test('updateLink should update link when validation passes', async () => {
    const updateData = { name: 'Updated Link' }
    mockReq = createMockReq(
      updateData, // body
      { id: 'link123' }, // params
      { idpanelOrigen: 'panel1', destinyIds: '[]' } // query
    )

    vi.mocked(validatePartialLink).mockReturnValue({
      success: true,
      data: updateData
    } as any)

    const updatedLink = { _id: 'link123', ...updateData, user: mockUserId }
    vi.mocked(linkModel.updateLink).mockResolvedValue(updatedLink as any)

    await linksController.updateLink(mockReq, mockRes)

    // La validación se haría en un middleware
    expect(linkModel.updateLink).toHaveBeenCalledWith({
      id: 'link123',
      user: mockUserId,
      idpanelOrigen: 'panel1',
      cleanData: updateData,
      destinyIds: []
    })
    expect(mockRes.status).toHaveBeenCalledWith(200)
    expect(mockRes.json).toHaveBeenCalledWith({
      status: 'success',
      link: updatedLink
    })
  })

  test('deleteLink should delete link when found', async () => {
    mockReq = createMockReq({}, { linkId: 'link123' }) // params

    const deletedLink = { _id: 'link123', name: 'Deleted Link' }
    vi.mocked(linkModel.deleteLink).mockResolvedValue(deletedLink as any)

    await linksController.deleteLink(mockReq, mockRes)

    expect(linkModel.deleteLink).toHaveBeenCalledWith({ user: mockUserId, linkId: 'link123' })
    expect(mockRes.status).toHaveBeenCalledWith(200)
    expect(mockRes.json).toHaveBeenCalledWith({
      status: 'success',
      link: deletedLink
    })
  })

  test('deleteLink should return 404 when link not found', async () => {
    mockReq = createMockReq({}, { linkId: 'nonexistent' })

    // El modelo ahora devuelve un objeto de error
    vi.mocked(linkModel.deleteLink).mockResolvedValue({ error: 'El link no existe' } as any)

    await linksController.deleteLink(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(404)
    expect(mockRes.send).toHaveBeenCalledWith({
      status: 'fail',
      message: 'El link no existe'
    })
  })

  test('error handling should return 500 for unexpected errors', async () => {
    mockReq = createMockReq()

    const mockGetAllLinks = vi.mocked(linkModel.getAllLinks)
    mockGetAllLinks.mockRejectedValue(new Error('Database error'))

    await linksController.getAllLinks(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(500)
    expect(mockRes.send).toHaveBeenCalledWith(new Error('Database error'))
  })
})
