import { Types } from 'mongoose'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CreateLinkData } from '../types/linkModel.types'
import { linkModel } from './linkModel'
import link from './schemas/linkSchema'

vi.mock('./schemas/linkSchema', () => ({
  default: {
    find: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    findOneAndDelete: vi.fn(),
    deleteMany: vi.fn(),
    updateMany: vi.fn(),
    countDocuments: vi.fn(),
    create: vi.fn(),
    aggregate: vi.fn(),
    bulkWrite: vi.fn()
  }
}))

const mockUserObjectId = new Types.ObjectId()
const mockUserId = mockUserObjectId.toHexString()
const mockLinkObjectId = new Types.ObjectId()
const mockLinkId = mockLinkObjectId.toHexString()
const mockCategoryObjectId = new Types.ObjectId()
const mockCategoryId = mockCategoryObjectId.toHexString()

describe('linkModel', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getAllLinks', () => {
    it('devuelve todos los links del usuario ordenados por order', async () => {
      const mockLinks = [{ _id: mockLinkId, name: 'Link 1' }, { _id: new Types.ObjectId().toHexString(), name: 'Link 2' }]
      vi.mocked(link.find).mockReturnValue({
        sort: vi.fn().mockResolvedValue(mockLinks)
      } as any)

      const result = await linkModel.getAllLinks({ user: mockUserId })
      expect(link.find).toHaveBeenCalledWith({ user: mockUserObjectId })
      expect(result).toEqual(mockLinks)
    })
  })

  describe('getLinkById', () => {
    it('devuelve el link si existe', async () => {
      const mockLink = { _id: mockLinkId, name: 'Test Link' }
      vi.mocked(link.findOne).mockResolvedValue(mockLink as any)
      const result = await linkModel.getLinkById({ user: mockUserId, id: mockLinkId })
      expect(link.findOne).toHaveBeenCalledWith({ user: mockUserObjectId, _id: mockLinkId })
      expect(result).toEqual(mockLink)
    })

    it('devuelve error si el link no existe', async () => {
      vi.mocked(link.findOne).mockResolvedValue(null)
      const result = await linkModel.getLinkById({ user: mockUserId, id: mockLinkId })
      expect(result).toEqual({ error: 'El link no existe' })
    })
  })

  describe('getLinksByTopCategory', () => {
    it('devuelve links si existen en la categoría', async () => {
      const mockLinks = [{ _id: mockLinkId, name: 'Link 1' }]
      vi.mocked(link.find).mockResolvedValue(mockLinks as any)
      const result = await linkModel.getLinksByTopCategory({ user: mockUserId, topCategory: 'test-category' })
      expect(link.find).toHaveBeenCalledWith({ user: mockUserObjectId, topCategory: 'test-category' })
      expect(result).toEqual(mockLinks)
    })

    it('devuelve error si no hay links en la categoría', async () => {
      vi.mocked(link.find).mockResolvedValue([])
      const result = await linkModel.getLinksByTopCategory({ user: mockUserId, topCategory: 'test-category' })
      expect(result).toEqual({ error: 'El link no existe' })
    })
  })

  describe('getLinksCount', () => {
    it('devuelve el conteo total de links del usuario cuando no se especifica categoría', async () => {
      vi.mocked(link.countDocuments).mockResolvedValue(5)
      const result = await linkModel.getLinksCount({ user: mockUserId })
      expect(link.countDocuments).toHaveBeenCalledWith({ user: mockUserObjectId })
      expect(result).toBe(5)
    })

    it('devuelve el conteo de links por categoría cuando se especifica', async () => {
      vi.mocked(link.countDocuments).mockResolvedValue(2)
      const result = await linkModel.getLinksCount({ user: mockUserId, categoryId: mockCategoryId })
      expect(link.countDocuments).toHaveBeenCalledWith({ user: mockUserObjectId, categoryId: mockCategoryObjectId })
      expect(result).toBe(2)
    })
  })

  describe('createLink', () => {
    it('crea un link correctamente', async () => {
      const cleanData: CreateLinkData = { name: 'New Link', url: 'https://example.com', user: mockUserId, categoryId: mockCategoryId }
      const mockCreated = { _id: mockLinkId, ...cleanData }
      vi.mocked(link.create).mockResolvedValue(mockCreated as any)

      const result = await linkModel.createLink({ cleanData })

      expect(link.create).toHaveBeenCalledWith({ ...cleanData })
      expect(result).toEqual(mockCreated)
    })
  })

  describe('updateLink', () => {
    it('actualiza un link correctamente', async () => {
      const mockUpdatedLink = { _id: mockLinkId, name: 'Updated Link' }
      vi.mocked(link.findOneAndUpdate).mockResolvedValue(mockUpdatedLink as any)
      const result = await linkModel.updateLink({ id: mockLinkId, user: mockUserId, fields: { name: 'Updated Link' } })
      expect(link.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockLinkId, user: mockUserObjectId }, // el modelo convierte el string a ObjectId
        { $set: { name: 'Updated Link' } },
        { new: true }
      )
      expect(result).toEqual(mockUpdatedLink)
    })

    it('ejecuta sortLinks cuando se especifica idpanelOrigen', async () => {
      const mockUpdatedLink = { _id: mockLinkId, name: 'Updated Link' }
      vi.mocked(link.findOneAndUpdate).mockResolvedValue(mockUpdatedLink as any)
      const sortLinksSpy = vi.spyOn(linkModel, 'sortLinks').mockResolvedValue({ message: 'sorted' })
      await linkModel.updateLink({ id: mockLinkId, user: mockUserId, oldCategoryId: mockCategoryId, fields: { name: 'Updated Link' } })
      expect(sortLinksSpy).toHaveBeenCalledWith({ idpanelOrigen: mockCategoryObjectId })
      sortLinksSpy.mockRestore()
    })
  })

  describe('bulkMoveLinks', () => {
    it('mueve múltiples links correctamente', async () => {
      const mockResult = { modifiedCount: 2 } as any
      vi.mocked(link.updateMany).mockResolvedValue(mockResult)
      const linksToMove = [new Types.ObjectId().toHexString(), new Types.ObjectId().toHexString()]
      const result = await linkModel.bulkMoveLinks({
        user: mockUserId,
        source: mockCategoryId,
        destiny: new Types.ObjectId().toHexString(),
        panel: 'Test Panel',
        links: linksToMove
      })
      expect(link.updateMany).toHaveBeenCalled()
      expect(result).toEqual(mockResult)
    })

    it('devuelve error si no se movieron enlaces', async () => {
      const mockResult = { modifiedCount: 0 } as any
      vi.mocked(link.updateMany).mockResolvedValue(mockResult)
      const result = await linkModel.bulkMoveLinks({
        user: mockUserId,
        source: mockCategoryId,
        destiny: new Types.ObjectId().toHexString(),
        panel: 'Test Panel',
        links: []
      })
      expect(result).toEqual({ error: 'No se movieron enlaces' })
    })
  })

  describe('deleteLink', () => {
    it('elimina múltiples links cuando se pasa un array', async () => {
      const mockResult = { deletedCount: 2 } as any
      vi.mocked(link.deleteMany).mockResolvedValue(mockResult)
      const linkIds = [new Types.ObjectId().toHexString(), new Types.ObjectId().toHexString()]
      const result = await linkModel.deleteLink({ user: mockUserId, linkId: linkIds })
      expect(link.deleteMany).toHaveBeenCalledWith({ _id: { $in: linkIds }, user: mockUserObjectId })
      expect(result).toEqual(mockResult)
    })

    it('elimina un link individual y ejecuta sortLinks', async () => {
      const mockDeletedLink = { _id: mockLinkId, categoryId: mockCategoryObjectId.toHexString() }
      vi.mocked(link.findOneAndDelete).mockResolvedValue(mockDeletedLink as any)
      const sortLinksSpy = vi.spyOn(linkModel, 'sortLinks').mockResolvedValue({ message: 'sorted' })

      const result = await linkModel.deleteLink({ user: mockUserId, linkId: mockLinkId })

      expect(link.findOneAndDelete).toHaveBeenCalledWith({ _id: mockLinkId, user: mockUserObjectId })
      expect(sortLinksSpy).toHaveBeenCalledWith({ idpanelOrigen: mockCategoryObjectId })
      expect(result).toEqual(mockDeletedLink)
      sortLinksSpy.mockRestore()
    })
  })

  describe('findDuplicateLinks', () => {
    it('encuentra links duplicados por URL', async () => {
      const mockDuplicates = [{ _id: 'http://a.com', count: 2 }]
      const mockFoundLinks = [[{ url: 'http://a.com' }]]
      vi.mocked(link.aggregate).mockResolvedValue(mockDuplicates as any)
      vi.mocked(link.find).mockResolvedValue(mockFoundLinks[0] as any)

      const result = await linkModel.findDuplicateLinks({ user: mockUserId })

      expect(link.aggregate).toHaveBeenCalledWith([
        { $match: { user: mockUserObjectId } },
        { $group: { _id: '$url', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }
      ])
      expect(result).toEqual(mockFoundLinks[0])
    })
  })

  describe('searchLinks', () => {
    it('busca links por nombre, url y notas', async () => {
      const mockLinks = [{ name: 'Test' }]
      vi.mocked(link.find).mockResolvedValue(mockLinks as any)
      const result = await linkModel.searchLinks({ user: mockUserId, query: 'test' })
      expect(link.find).toHaveBeenCalledWith({
        $or: [
          { name: 'test', user: mockUserObjectId },
          { url: 'test', user: mockUserObjectId },
          { notes: 'test', user: mockUserObjectId }
        ]
      })
      expect(result).toEqual(mockLinks)
    })
  })

  describe('setBookMarksOrder', () => {
    it('actualiza el orden de bookmarks correctamente', async () => {
      vi.mocked(link.bulkWrite).mockResolvedValue({} as any)
      const links: Array<[string, number]> = [[mockLinkId, 1], [new Types.ObjectId().toHexString(), 0]]
      const result = await linkModel.setBookMarksOrder({ user: mockUserId, links })

      const expectedUpdateOps = links.map(([linkId, order]) => ({
        updateOne: {
          filter: { _id: new Types.ObjectId(linkId), user: mockUserObjectId },
          update: { $set: { bookmarkOrder: order } }
        }
      }))

      expect(link.bulkWrite).toHaveBeenCalledWith(expectedUpdateOps)
      expect(result).toEqual(links.map(([id, order]) => ({ id, order })))
    })

    it('lanza error cuando bulkWrite falla', async () => {
      const error = new Error('BulkWrite failed')
      vi.mocked(link.bulkWrite).mockRejectedValue(error)
      const links: Array<[string, number]> = [[mockLinkId, 1]]
      await expect(linkModel.setBookMarksOrder({ user: mockUserId, links })).rejects.toThrow(error)
    })
  })

  describe('sortLinks', () => {
    it('ordena links cuando no se especifican elementos', async () => {
      const mockLinks = [{ _id: new Types.ObjectId() }, { _id: new Types.ObjectId() }]
      vi.mocked(link.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue(mockLinks)
        })
      } as any)
      vi.mocked(link.bulkWrite).mockResolvedValue({ isOk: () => true } as any)

      const result = await linkModel.sortLinks({ idpanelOrigen: mockCategoryObjectId.toString() })

      expect(link.find).toHaveBeenCalledWith({ categoryId: mockCategoryObjectId })
      expect(link.bulkWrite).toHaveBeenCalled()
      expect(result).toEqual({ message: 'Links sorted successfully' })
    })

    it('ordena links con elementos especificados', async () => {
      const elementos = [new Types.ObjectId().toHexString(), new Types.ObjectId().toHexString()]
      vi.mocked(link.bulkWrite).mockResolvedValue({ isOk: () => true } as any)
      const result = await linkModel.sortLinks({ idpanelOrigen: mockCategoryObjectId.toString(), elementos })
      expect(link.find).not.toHaveBeenCalled()
      expect(link.bulkWrite).toHaveBeenCalled()
      expect(result).toEqual({ message: 'Links sorted successfully' })
    })
  })
})
