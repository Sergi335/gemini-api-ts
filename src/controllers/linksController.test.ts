import { describe, test, expect, vi, beforeEach } from 'vitest'
import type { Request, Response } from 'express'
import { linkModel } from '../models/linkModel'
import { validateLink, validatePartialLink } from '../validation/linksZodSchema'
import { getLinkStatusLocal, getLinkNameByUrlLocal } from '../utils/linksUtils'
import { linksController } from '../controllers/linksController'

// Mock the dependencies
vi.mock('../models/linkModel')
vi.mock('../validation/linksZodSchema')
vi.mock('../utils/linksUtils')

interface RequestWithUser extends Request {
  user: { name: string }
}

const createMockReq = (
  body: any = {},
  params: any = {},
  query: any = {},
  user = { name: 'testuser' }
): RequestWithUser => {
  // Crear un objeto que satisfaga la interfaz RequestWithUser
  return Object.assign({}, {
    body,
    params,
    query,
    user
  }) as RequestWithUser
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
      { _id: '1', name: 'Test Link', url: 'https://example.com', user: 'testuser' }
    ]

    const mockGetAllLinks = vi.mocked(linkModel.getAllLinks)
    mockGetAllLinks.mockResolvedValue(mockLinks as any)

    await linksController.getAllLinks(mockReq, mockRes)

    expect(mockGetAllLinks).toHaveBeenCalledWith({ user: 'testuser' })
    expect(mockRes.status).toHaveBeenCalledWith(200)
    expect(mockRes.json).toHaveBeenCalledWith({ status: 'success', data: mockLinks })
  })

  test('createLink should create new link when validation passes', async () => {
    const linkData = {
      name: 'New Link',
      url: 'https://newlink.com',
      categoryId: 'cat123'
    }
    mockReq = createMockReq({ data: [linkData] })

    const mockValidateLink = vi.mocked(validateLink)
    mockValidateLink.mockReturnValue({
      success: true,
      data: {
        name: 'New Link',
        url: 'https://newlink.com',
        description: '',
        bookmark: false,
        bookmarkOrder: 0,
        readlist: false,
        user: 'testuser'
      }
    })

    const mockCreateLink = vi.mocked(linkModel.createLink)
    const createdLink = { _id: 'newId', ...linkData, user: 'testuser' }
    mockCreateLink.mockResolvedValue(createdLink as any)

    await linksController.createLink(mockReq, mockRes)

    expect(mockValidateLink).toHaveBeenCalledWith({ ...linkData, user: 'testuser' })
    expect(mockCreateLink).toHaveBeenCalledWith({ cleanData: expect.any(Object) })
    expect(mockRes.status).toHaveBeenCalledWith(201)
    expect(mockRes.json).toHaveBeenCalledWith({
      status: 'success',
      link: createdLink
    })
  })

  test('createLink should return error when validation fails', async () => {
    mockReq = createMockReq({ data: [{ name: '', url: 'invalid' }] })

    const mockValidateLink = vi.mocked(validateLink)
    mockValidateLink.mockReturnValue({
      success: false,
      error: {
        errors: [{ message: 'Invalid data' }]
      } as any
    })

    await linksController.createLink(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalledWith({
      status: 'fail',
      message: ['Invalid data']
    })
  })

  test('updateLink should update link when validation passes', async () => {
    const updateData = { name: 'Updated Link' }
    mockReq = createMockReq({
      fields: updateData,
      id: 'link123',
      idpanelOrigen: 'panel1',
      destinyIds: []
    })

    const mockValidatePartialLink = vi.mocked(validatePartialLink)
    mockValidatePartialLink.mockReturnValue({
      success: true,
      data: {
        name: 'Updated Link',
        description: '',
        bookmark: false,
        bookmarkOrder: 0,
        readlist: false
      }
    })

    const mockUpdateLink = vi.mocked(linkModel.updateLink)
    const updatedLink = { _id: 'link123', ...updateData, user: 'testuser' }
    mockUpdateLink.mockResolvedValue(updatedLink as any)

    await linksController.updateLink(mockReq, mockRes)

    expect(mockValidatePartialLink).toHaveBeenCalledWith({ ...updateData, user: 'testuser' })
    expect(mockUpdateLink).toHaveBeenCalledWith({
      id: 'link123',
      user: 'testuser',
      idpanelOrigen: 'panel1',
      cleanData: expect.any(Object),
      destinyIds: []
    })
    expect(mockRes.status).toHaveBeenCalledWith(200)
    expect(mockRes.json).toHaveBeenCalledWith({
      status: 'success',
      link: updatedLink
    })
  })

  test('deleteLink should delete link when found', async () => {
    mockReq = createMockReq({ linkId: 'link123' })

    const mockDeleteLink = vi.mocked(linkModel.deleteLink)
    const deletedLink = { _id: 'link123', name: 'Deleted Link' }
    mockDeleteLink.mockResolvedValue(deletedLink as any)

    await linksController.deleteLink(mockReq, mockRes)

    expect(mockDeleteLink).toHaveBeenCalledWith({ user: 'testuser', linkId: 'link123' })
    expect(mockRes.status).toHaveBeenCalledWith(200)
    expect(mockRes.send).toHaveBeenCalledWith({
      status: 'success',
      link: deletedLink
    })
  })

  test('deleteLink should return 404 when link not found', async () => {
    mockReq = createMockReq({ linkId: 'nonexistent' })

    const mockDeleteLink = vi.mocked(linkModel.deleteLink)
    mockDeleteLink.mockResolvedValue(undefined as any)

    await linksController.deleteLink(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(404)
    expect(mockRes.send).toHaveBeenCalledWith({
      status: 'fail',
      message: 'El link no existe'
    })
  })

  test('getLinkStatus should return link status', async () => {
    mockReq = createMockReq({}, {}, { url: 'https://example.com' })

    const mockGetLinkStatus = vi.mocked(getLinkStatusLocal)
    mockGetLinkStatus.mockResolvedValue({ status: '200 OK' })

    await linksController.getLinkStatus(mockReq, mockRes)

    expect(mockGetLinkStatus).toHaveBeenCalledWith({ url: 'https://example.com' })
    expect(mockRes.send).toHaveBeenCalledWith({ status: '200 OK' })
  })

  test('getLinkNameByUrl should return link name', async () => {
    mockReq = createMockReq({}, {}, { url: 'https://example.com' })

    const mockGetLinkName = vi.mocked(getLinkNameByUrlLocal)
    mockGetLinkName.mockResolvedValue('Example Site')

    await linksController.getLinkNameByUrl(mockReq, mockRes)

    expect(mockGetLinkName).toHaveBeenCalledWith({ url: 'https://example.com' })
    expect(mockRes.send).toHaveBeenCalledWith('Example Site')
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
