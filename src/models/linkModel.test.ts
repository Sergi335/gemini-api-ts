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
      // Corregido: usa 'id' en lugar de 'categoryId'
      const result = await linkModel.getLinksByTopCategoryId({ user: mockUserId, id: mockCategoryId })
      // Corregido: la consulta usa categoryId, no topCategory
      expect(link.find).toHaveBeenCalledWith({ user: mockUserObjectId, categoryId: mockCategoryObjectId })
      expect(result).toEqual(mockLinks)
    })

    it('devuelve error si no hay links en la categoría', async () => {
      vi.mocked(link.find).mockResolvedValue([])
      const result = await linkModel.getLinksByTopCategoryId({ user: mockUserId, id: mockCategoryId })
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
      const result = await linkModel.updateLink({
        updates: [{ id: mockLinkId, user: mockUserId, fields: { name: 'Updated Link' } }]
      })
      expect(link.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockLinkObjectId, user: mockUserObjectId },
        { $set: { name: 'Updated Link' } },
        { new: true }
      )
      expect(result).toEqual([mockUpdatedLink])
    })

    it('ejecuta sortLinks cuando se especifica previousIds', async () => {
      const mockUpdatedLink = { _id: mockLinkId, name: 'Updated Link' }
      const previousIds = [
        { id: mockLinkId, order: 0, categoryId: mockCategoryId }
      ]
      vi.mocked(link.findOneAndUpdate).mockResolvedValue(mockUpdatedLink as any)
      const sortLinksSpy = vi.spyOn(linkModel, 'sortLinks').mockResolvedValue({ message: 'success' })

      await linkModel.updateLink({
        updates: [{
          id: mockLinkId,
          user: mockUserId,
          previousIds,
          fields: { name: 'Updated Link' }
        }]
      })

      expect(sortLinksSpy).toHaveBeenCalledWith({ previousIds })
      sortLinksSpy.mockRestore()
    })
  })

  describe('deleteLink', () => {
    it('elimina múltiples links cuando se pasa un array', async () => {
      const mockResult = { deletedCount: 2 } as any
      const linkIds = [new Types.ObjectId().toHexString(), new Types.ObjectId().toHexString()]

      // Crear mocks separados para diferentes llamadas a link.find
      const findCallCount = { count: 0 }

      vi.mocked(link.find).mockImplementation((query: any) => {
        findCallCount.count++

        if (findCallCount.count === 1) {
          // Primera llamada: buscar links antes de eliminar
          return {
            select: vi.fn().mockResolvedValue([
              { categoryId: mockCategoryObjectId },
              { categoryId: mockCategoryObjectId }
            ])
          } as any
        } else {
          // Siguientes llamadas: buscar links restantes para reordenar
          return {
            sort: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue([])
            })
          } as any
        }
      })

      vi.mocked(link.deleteMany).mockResolvedValue(mockResult)
      vi.mocked(link.bulkWrite).mockResolvedValue({} as any)

      const result = await linkModel.deleteLink({ user: mockUserId, linkId: linkIds })

      expect(link.deleteMany).toHaveBeenCalledWith({ _id: { $in: linkIds }, user: mockUserObjectId })
      expect(result).toEqual(mockResult)
    })

    it('elimina un link individual', async () => {
      const mockDeletedLink = { _id: mockLinkId, categoryId: mockCategoryObjectId }
      vi.mocked(link.findOneAndDelete).mockResolvedValue(mockDeletedLink as any)

      // Mock para reordenación - links restantes
      vi.mocked(link.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue([])
        })
      } as any)

      vi.mocked(link.bulkWrite).mockResolvedValue({} as any)

      const result = await linkModel.deleteLink({ user: mockUserId, linkId: mockLinkId })

      expect(link.findOneAndDelete).toHaveBeenCalledWith({ _id: mockLinkId, user: mockUserObjectId })
      expect(result).toEqual(mockDeletedLink)
    })
  })

  describe('findDuplicateLinks', () => {
    it('encuentra links duplicados por URL', async () => {
      const mockDuplicates = [{ _id: 'http://a.com', count: 2 }]
      const mockFoundLinks = [{ url: 'http://a.com' }]
      vi.mocked(link.aggregate).mockResolvedValue(mockDuplicates as any)
      vi.mocked(link.find).mockResolvedValue(mockFoundLinks as any)

      const result = await linkModel.findDuplicateLinks({ user: mockUserId })

      expect(link.aggregate).toHaveBeenCalledWith([
        { $match: { user: mockUserObjectId } },
        { $group: { _id: '$url', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }
      ])
      expect(result).toEqual(mockFoundLinks)
    })
  })

  describe('sortLinks', () => {
    it('ordena links cuando no se especifican elementos', async () => {
      // No hay elementos para ordenar cuando no se pasan ni destinyIds ni previousIds
      const result = await linkModel.sortLinks({})

      expect(result).toEqual({ error: 'No hay elementos para ordenar' })
    })

    it('ordena links con destinyIds especificados', async () => {
      const destinyIds = [
        { id: new Types.ObjectId().toHexString(), order: 0, categoryId: mockCategoryId },
        { id: new Types.ObjectId().toHexString(), order: 1, categoryId: mockCategoryId }
      ]

      // Mock para findOneAndUpdate que se llama para cada elemento
      vi.mocked(link.findOneAndUpdate).mockResolvedValue({} as any)

      const result = await linkModel.sortLinks({ destinyIds })

      // Verificar que se llamó findOneAndUpdate para cada elemento
      expect(link.findOneAndUpdate).toHaveBeenCalledTimes(destinyIds.length)

      // Verificar las llamadas específicas
      expect(link.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: new Types.ObjectId(destinyIds[0].id),
          categoryId: new Types.ObjectId(destinyIds[0].categoryId)
        },
        { order: destinyIds[0].order },
        { new: true }
      )

      expect(result).toEqual({ message: 'success' })
    })

    it('ordena links con previousIds especificados', async () => {
      const previousIds = [
        { id: new Types.ObjectId().toHexString(), order: 0, categoryId: mockCategoryId },
        { id: new Types.ObjectId().toHexString(), order: 1, categoryId: mockCategoryId }
      ]

      // Mock para findOneAndUpdate que se llama para cada elemento
      vi.mocked(link.findOneAndUpdate).mockResolvedValue({} as any)

      const result = await linkModel.sortLinks({ previousIds })

      // Verificar que se llamó findOneAndUpdate para cada elemento
      expect(link.findOneAndUpdate).toHaveBeenCalledTimes(previousIds.length)

      // Verificar las llamadas específicas
      expect(link.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: new Types.ObjectId(previousIds[0].id),
          categoryId: new Types.ObjectId(previousIds[0].categoryId)
        },
        { order: previousIds[0].order },
        { new: true }
      )

      expect(result).toEqual({ message: 'success' })
    })

    it('ordena links con ambos destinyIds y previousIds especificados', async () => {
      const destinyIds = [
        { id: new Types.ObjectId().toHexString(), order: 0, categoryId: mockCategoryId }
      ]
      const previousIds = [
        { id: new Types.ObjectId().toHexString(), order: 1, categoryId: mockCategoryId }
      ]

      // Mock para findOneAndUpdate que se llama para cada elemento
      vi.mocked(link.findOneAndUpdate).mockResolvedValue({} as any)

      const result = await linkModel.sortLinks({ destinyIds, previousIds })

      // Verificar que se llamó findOneAndUpdate para ambos arrays
      expect(link.findOneAndUpdate).toHaveBeenCalledTimes(destinyIds.length + previousIds.length)

      expect(result).toEqual({ message: 'success' })
    })
  })
})
