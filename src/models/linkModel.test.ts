import type { DeleteResult } from 'mongodb'
import mongoose from 'mongoose'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { linkModel } from './linkModel'
import link from './schemas/linkSchema'

vi.mock('./schemas/linkSchema')

describe('linkModel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAllLinks', () => {
    it('devuelve todos los links del usuario ordenados por order', async () => {
      const mockData = [
        { name: 'Link 1', user: 'user1', order: 1 },
        { name: 'Link 2', user: 'user1', order: 2 }
      ]
      // @ts-expect-error
      link.find.mockImplementation(({ user }) => ({
        sort: vi.fn().mockResolvedValue(user === 'user1' ? mockData : [])
      }))

      const result = await linkModel.getAllLinks({ user: 'user1' })

      expect(link.find).toHaveBeenCalledWith({ user: 'user1' })
      expect(result).toEqual(mockData)
    })

    it('devuelve array vacío si no hay links', async () => {
      // @ts-expect-error
      link.find.mockImplementation(() => ({
        sort: vi.fn().mockResolvedValue([])
      }))

      const result = await linkModel.getAllLinks({ user: 'user2' })

      expect(result).toEqual([])
    })
  })

  describe('getLinkById', () => {
    it('devuelve el link si existe', async () => {
      const mockLink = { _id: 'linkId1', name: 'Test Link', user: 'user1' }
      // @ts-expect-error
      link.findOne.mockResolvedValue(mockLink)

      const result = await linkModel.getLinkById({ user: 'user1', id: 'linkId1' })

      expect(link.findOne).toHaveBeenCalledWith({ user: 'user1', _id: 'linkId1' })
      expect(result).toEqual(mockLink)
    })

    it('devuelve error si el link no existe', async () => {
      // @ts-expect-error
      link.findOne.mockResolvedValue(null)

      const result = await linkModel.getLinkById({ user: 'user1', id: 'nonexistent' })

      expect(result).toEqual({ error: 'El link no existe' })
    })
  })

  describe('getLinksByTopCategory', () => {
    it('devuelve links si existen en la categoría', async () => {
      const mockData = [{ name: 'Link 1', topCategory: 'tech' }]
      // @ts-expect-error
      link.find.mockResolvedValue(mockData)

      const result = await linkModel.getLinksByTopCategory({ user: 'user1', topCategory: 'tech' })

      expect(link.find).toHaveBeenCalledWith({ user: 'user1', topCategory: 'tech' })
      expect(result).toEqual(mockData)
    })

    it('devuelve error si no hay links en la categoría', async () => {
      // @ts-expect-error
      link.find.mockResolvedValue([])

      const result = await linkModel.getLinksByTopCategory({ user: 'user1', topCategory: 'empty' })

      expect(result).toEqual({ error: 'El link no existe' })
    })
  })

  describe('getLinksCount', () => {
    it('devuelve el conteo total de links del usuario cuando no se especifica categoría', async () => {
      // @ts-expect-error
      link.countDocuments.mockResolvedValue(5)

      const result = await linkModel.getLinksCount({ user: 'user1' })

      expect(link.countDocuments).toHaveBeenCalledWith({ user: 'user1' })
      expect(result).toBe(5)
    })

    it('devuelve el conteo de links por categoría cuando se especifica', async () => {
      // @ts-expect-error
      link.countDocuments.mockResolvedValue(3)

      const result = await linkModel.getLinksCount({ user: 'user1', categoryId: 'cat1' })

      expect(link.countDocuments).toHaveBeenCalledWith({ user: 'user1', categoryId: 'cat1' })
      expect(result).toBe(3)
    })

    it('devuelve el conteo total cuando la categoría está vacía', async () => {
      // @ts-expect-error
      link.countDocuments.mockResolvedValue(5)

      const result = await linkModel.getLinksCount({ user: 'user1', categoryId: '  ' })

      expect(link.countDocuments).toHaveBeenCalledWith({ user: 'user1' })
      expect(result).toBe(5)
    })
  })

  describe('createLink', () => {
    it('crea un link correctamente', async () => {
      const cleanData = { name: 'New Link', url: 'https://example.com', user: 'user1' }
      const mockCreated = { _id: 'newId', ...cleanData }
      // @ts-expect-error
      link.create.mockResolvedValue(mockCreated)

      const result = await linkModel.createLink({ cleanData })

      expect(link.create).toHaveBeenCalledWith({ ...cleanData })
      expect(result).toEqual(mockCreated)
    })
  })

  describe('updateLink', () => {
    beforeEach(() => {
      vi.spyOn(linkModel, 'sortLinks').mockResolvedValue({ message: 'success' })
    })

    it('actualiza un link correctamente', async () => {
      const cleanData = { name: 'Updated Link' }
      const mockUpdated = { _id: 'linkId1', ...cleanData }
      // @ts-expect-error
      link.findOneAndUpdate.mockResolvedValue(mockUpdated)

      const result = await linkModel.updateLink({
        id: 'linkId1',
        user: 'user1',
        cleanData
      })

      expect(link.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'linkId1', user: 'user1' },
        { $set: { ...cleanData } },
        { new: true }
      )
      expect(result).toEqual(mockUpdated)
    })

    it('ejecuta sortLinks cuando se especifica idpanelOrigen', async () => {
      const cleanData = { name: 'Updated Link' }
      const mockUpdated = { _id: 'linkId1', ...cleanData }
      // @ts-expect-error
      link.findOneAndUpdate.mockResolvedValue(mockUpdated)

      await linkModel.updateLink({
        id: 'linkId1',
        user: 'user1',
        idpanelOrigen: 'panel1',
        cleanData
      })

      expect(linkModel.sortLinks).toHaveBeenCalledWith({ idpanelOrigen: 'panel1' })
    })

    it('devuelve error si el link no existe', async () => {
      // @ts-expect-error
      link.findOneAndUpdate.mockResolvedValue(null)

      const result = await linkModel.updateLink({
        id: 'nonexistent',
        user: 'user1',
        cleanData: { name: 'Test' }
      })

      expect(result).toEqual({ error: 'El link no existe' })
    })
  })

  describe('bulkMoveLinks', () => {
    it('mueve múltiples links correctamente', async () => {
      const mockResult = { acknowledged: true, matchedCount: 3, modifiedCount: 3, upsertedCount: 0, upsertedId: null }
      // @ts-expect-error
      link.updateMany.mockResolvedValue(mockResult)

      const result = await linkModel.bulkMoveLinks({
        user: 'user1',
        source: 'cat1',
        destiny: 'cat2',
        panel: 'Panel 2',
        links: ['link1', 'link2', 'link3']
      })

      expect(link.updateMany).toHaveBeenCalledWith(
        { _id: { $in: ['link1', 'link2', 'link3'] }, user: 'user1' },
        { $set: { categoryId: 'cat2', categoryName: 'Panel 2', escritorio: undefined } }
      )
      expect(result).toEqual(mockResult)
    })

    it('devuelve error si no se movieron enlaces', async () => {
      const mockResult = { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 0, upsertedId: null }
      // @ts-expect-error
      link.updateMany.mockResolvedValue(mockResult)

      const result = await linkModel.bulkMoveLinks({
        user: 'user1',
        source: 'cat1',
        destiny: 'cat2',
        panel: 'Panel 2',
        links: ['nonexistent']
      })

      expect(result).toEqual({ error: 'No se movieron enlaces' })
    })
  })

  describe('deleteLink', () => {
    beforeEach(() => {
      vi.spyOn(linkModel, 'sortLinks').mockResolvedValue({ message: 'success' })
    })

    it('elimina múltiples links cuando se pasa un array', async () => {
      const mockResult: DeleteResult = { acknowledged: true, deletedCount: 2 }
      // @ts-expect-error
      link.deleteMany.mockResolvedValue(mockResult)

      const result = await linkModel.deleteLink({
        user: 'user1',
        linkId: ['link1', 'link2']
      })

      expect(link.deleteMany).toHaveBeenCalledWith(
        { _id: { $in: ['link1', 'link2'] }, user: 'user1' }
      )
      expect(result).toEqual(mockResult)
    })

    it('elimina un link individual y ejecuta sortLinks', async () => {
      const mockLink = { _id: 'link1', categoryId: 'cat1', name: 'Test Link' }
      // @ts-expect-error
      link.findOneAndDelete.mockResolvedValue(mockLink)

      const result = await linkModel.deleteLink({
        user: 'user1',
        linkId: 'link1'
      })

      expect(link.findOneAndDelete).toHaveBeenCalledWith({ _id: 'link1', user: 'user1' })
      expect(linkModel.sortLinks).toHaveBeenCalledWith({ idpanelOrigen: 'cat1' })
      expect(result).toEqual(mockLink)
    })

    it('no ejecuta sortLinks si categoryId está vacío', async () => {
      const mockLink = { _id: 'link1', categoryId: '', name: 'Test Link' }
      // @ts-expect-error
      link.findOneAndDelete.mockResolvedValue(mockLink)

      await linkModel.deleteLink({
        user: 'user1',
        linkId: 'link1'
      })

      expect(linkModel.sortLinks).not.toHaveBeenCalled()
    })

    it('devuelve error si el link individual no existe', async () => {
      // @ts-expect-error
      link.findOneAndDelete.mockResolvedValue(null)

      const result = await linkModel.deleteLink({
        user: 'user1',
        linkId: 'nonexistent'
      })

      expect(result).toEqual({ error: 'El link no existe' })
    })
  })

  describe('findDuplicateLinks', () => {
    it('encuentra links duplicados por URL', async () => {
      const mockAggregateResult = [
        { _id: 'https://example.com', count: 2 }
      ]
      const mockDuplicates = [
        { _id: 'link1', url: 'https://example.com' },
        { _id: 'link2', url: 'https://example.com' }
      ]

      // @ts-expect-error
      link.aggregate.mockResolvedValue(mockAggregateResult)
      // @ts-expect-error
      link.find.mockResolvedValue(mockDuplicates)

      const result = await linkModel.findDuplicateLinks({ user: 'user1' })

      expect(link.aggregate).toHaveBeenCalledWith([
        { $match: { user: 'user1' } },
        { $group: { _id: '$url', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }
      ])
      expect(link.find).toHaveBeenCalledWith({ url: 'https://example.com', user: 'user1' })
      expect(result).toEqual(mockDuplicates)
    })

    it('devuelve error cuando hay problema en la consulta', async () => {
      const error = new Error('Database error')
      // @ts-expect-error
      link.aggregate.mockRejectedValue(error)

      const result = await linkModel.findDuplicateLinks({ user: 'user1' })

      expect(result).toEqual({ error: 'Error: Database error' })
    })
  })

  describe('setImagesInDb', () => {
    it('añade una imagen al link correctamente', async () => {
      const mockUpdated = { _id: 'link1', images: ['newImage.jpg'] }
      // @ts-expect-error
      link.findOneAndUpdate.mockResolvedValue(mockUpdated)

      const result = await linkModel.setImagesInDb({
        url: 'newImage.jpg',
        user: 'user1',
        linkId: 'link1'
      })

      expect(link.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'link1', user: 'user1' },
        { $push: { images: 'newImage.jpg' } },
        { new: true }
      )
      expect(result).toEqual(mockUpdated)
    })

    it('devuelve error si la URL está vacía', async () => {
      const result = await linkModel.setImagesInDb({
        url: '  ',
        user: 'user1',
        linkId: 'link1'
      })

      expect(result).toEqual({ error: 'No hay url' })
    })

    it('devuelve error si no se encuentra el link', async () => {
      // @ts-expect-error
      link.findOneAndUpdate.mockResolvedValue(null)

      const result = await linkModel.setImagesInDb({
        url: 'image.jpg',
        user: 'user1',
        linkId: 'nonexistent'
      })

      expect(result).toEqual({ error: 'Link no encontrado' })
    })
  })

  describe('deleteImageOnDb', () => {
    it('elimina una imagen del link correctamente', async () => {
      const mockUpdated = { _id: 'link1', images: [] }
      // @ts-expect-error
      link.findOneAndUpdate.mockResolvedValue(mockUpdated)

      const result = await linkModel.deleteImageOnDb({
        url: 'imageToDelete.jpg',
        user: 'user1',
        linkId: 'link1'
      })

      expect(link.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'link1', user: 'user1' },
        { $pull: { images: { $in: ['imageToDelete.jpg'] } } },
        { new: true }
      )
      expect(result).toEqual(mockUpdated)
    })

    it('devuelve error si no se encuentra el link', async () => {
      // @ts-expect-error
      link.findOneAndUpdate.mockResolvedValue(null)

      const result = await linkModel.deleteImageOnDb({
        url: 'image.jpg',
        user: 'user1',
        linkId: 'nonexistent'
      })

      expect(result).toEqual({ error: 'No encontrado' })
    })

    it('maneja errores de base de datos', async () => {
      const error = new Error('DB Error')
      // @ts-expect-error
      link.findOneAndUpdate.mockRejectedValue(error)

      const result = await linkModel.deleteImageOnDb({
        url: 'image.jpg',
        user: 'user1',
        linkId: 'link1'
      })

      expect(result).toEqual({ error: 'Error al borrar' })
    })
  })

  describe('setLinkImgInDb', () => {
    it('actualiza la imagen del link con URL de Firebase', async () => {
      const firebaseUrl = 'https://firebasestorage.googleapis.com/path/to/image.jpg'
      // @ts-expect-error
      link.findOneAndUpdate.mockResolvedValue({})

      const result = await linkModel.setLinkImgInDb({
        url: firebaseUrl,
        user: 'user1',
        linkId: 'link1'
      })

      expect(link.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'link1', user: 'user1' },
        { $set: { imgURL: firebaseUrl } }
      )
      expect(result).toEqual({ message: 'imagen de link cambiada' })
    })

    it('actualiza la imagen del link con URL de Google Static', async () => {
      const googleUrl = 'https://t1.gstatic.com/path/to/image.jpg'
      // @ts-expect-error
      link.findOneAndUpdate.mockResolvedValue({})

      const result = await linkModel.setLinkImgInDb({
        url: googleUrl,
        user: 'user1',
        linkId: 'link1'
      })

      expect(link.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'link1', user: 'user1' },
        { $set: { imgURL: googleUrl } }
      )
      expect(result).toEqual({ message: 'imagen de link cambiada' })
    })

    it('usa solo el pathname para URLs de otros dominios', async () => {
      const externalUrl = 'https://example.com/path/to/image.jpg'
      // @ts-expect-error
      link.findOneAndUpdate.mockResolvedValue({})

      const result = await linkModel.setLinkImgInDb({
        url: externalUrl,
        user: 'user1',
        linkId: 'link1'
      })

      expect(link.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'link1', user: 'user1' },
        { $set: { imgURL: '/path/to/image.jpg' } }
      )
      expect(result).toEqual({ message: 'imagen de link cambiada' })
    })

    it('maneja errores durante la actualización', async () => {
      const error = new Error('Update failed')
      // @ts-expect-error
      link.findOneAndUpdate.mockRejectedValue(error)

      const result = await linkModel.setLinkImgInDb({
        url: 'https://example.com/image.jpg',
        user: 'user1',
        linkId: 'link1'
      })

      expect(result).toEqual({ error })
    })
  })

  describe('searchLinks', () => {
    it('busca links por nombre, url y notas', async () => {
      const mockResults = [
        { name: 'Test Link', url: 'https://test.com' },
        { notes: 'Test notes' }
      ]
      // @ts-expect-error
      link.find.mockResolvedValue(mockResults)

      const result = await linkModel.searchLinks({
        user: 'user1',
        query: 'test'
      })

      expect(link.find).toHaveBeenCalledWith({
        $or: [
          { name: 'test', user: 'user1' },
          { url: 'test', user: 'user1' },
          { notes: 'test', user: 'user1' }
        ]
      })
      expect(result).toEqual(mockResults)
    })
  })

  describe('setBookMarksOrder', () => {
    it('actualiza el orden de bookmarks correctamente', async () => {
      const links = [['link1', 1], ['link2', 2]] as Array<[string, number]>
      // @ts-expect-error
      link.bulkWrite.mockResolvedValue({})

      const result = await linkModel.setBookMarksOrder({
        user: 'user1',
        links
      })

      expect(link.bulkWrite).toHaveBeenCalledWith([
        {
          updateOne: {
            filter: { _id: 'link1', user: 'user1' },
            update: { $set: { bookmarkOrder: 1 } }
          }
        },
        {
          updateOne: {
            filter: { _id: 'link2', user: 'user1' },
            update: { $set: { bookmarkOrder: 2 } }
          }
        }
      ])
      expect(result).toEqual([
        { id: 'link1', order: 1 },
        { id: 'link2', order: 2 }
      ])
    })

    it('lanza error cuando bulkWrite falla', async () => {
      const error = new Error('BulkWrite failed')
      // @ts-expect-error
      link.bulkWrite.mockRejectedValue(error)

      await expect(linkModel.setBookMarksOrder({
        user: 'user1',
        links: [['link1', 1]]
      })).rejects.toThrow('BulkWrite failed')
    })
  })

  describe('sortLinks', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('ordena links cuando no se especifican elementos', async () => {
      const mockLinks = [
        { _id: '507f1f77bcf86cd799439011' },
        { _id: '507f1f77bcf86cd799439012' }
      ]

      // @ts-expect-error
      link.find.mockImplementation(() => ({
        sort: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue(mockLinks)
        })
      }))
      // @ts-expect-error
      link.findOneAndUpdate.mockResolvedValue({})

      const result = await linkModel.sortLinks({
        idpanelOrigen: new mongoose.Types.ObjectId('cat1')
      })

      expect(result).toEqual({ message: 'success' })
    })

    it('ordena links con elementos especificados', async () => {
      const elementos = ['elem1', 'elem2', 'elem3']
      // @ts-expect-error
      link.findOneAndUpdate.mockResolvedValue({})

      const result = await linkModel.sortLinks({
        idpanelOrigen: new mongoose.Types.ObjectId('cat1'),
        elementos
      })

      expect(result).toEqual({ message: 'success' })
    })

    it('devuelve success para casos donde no hay elementos específicos', async () => {
      // Simulamos el caso exitoso básico
      // @ts-expect-error
      link.find.mockImplementation(() => ({
        sort: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue([])
        })
      }))

      const result = await linkModel.sortLinks({
        idpanelOrigen: new mongoose.Types.ObjectId('cat1')
      })

      expect(result).toEqual({ message: 'success' })
    })
  })
})
