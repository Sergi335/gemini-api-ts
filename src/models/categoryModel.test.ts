import { Types } from 'mongoose'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { categoryModel } from './categoryModel'
import category from './schemas/categorySchema'
import link from './schemas/linkSchema'

vi.mock('./schemas/categorySchema', () => ({
  default: {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    findOneAndUpdate: vi.fn(),
    deleteOne: vi.fn(),
    countDocuments: vi.fn()
  }
}))
vi.mock('./schemas/linkSchema', () => ({
  default: {
    deleteMany: vi.fn(),
    updateMany: vi.fn()
  }
}))

const mockUserObjectId = new Types.ObjectId()
const mockUserId = mockUserObjectId.toHexString()
const mockParentObjectId = new Types.ObjectId()
const mockParentId = mockParentObjectId.toHexString()
const mockCategoryObjectId = new Types.ObjectId()
const mockCategoryId = mockCategoryObjectId.toHexString()

describe('categoryModel', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getAllCategories', () => {
    it('devuelve categorías del usuario', async () => {
      const mockData = [{ name: 'cat1', user: mockUserId, order: 1 }]
      vi.mocked(category.find).mockReturnValue({
        sort: vi.fn().mockResolvedValue(mockData)
      } as any)
      const result = await categoryModel.getAllCategories({ user: mockUserId })
      expect(category.find).toHaveBeenCalledWith({ user: mockUserObjectId })
      expect(result).toEqual(mockData)
    })

    it('devuelve error si no hay categorías', async () => {
      vi.mocked(category.find).mockReturnValue({
        sort: vi.fn().mockResolvedValue([])
      } as any)
      const result = await categoryModel.getAllCategories({ user: mockUserId })
      expect(result).toEqual({ error: 'No se encontraron categorías' })
    })
  })

  describe('getCategoriesByParentSlug', () => {
    it('devuelve categorías si existen para el parent', async () => {
      const mockData = [{ name: 'cat2', user: mockUserId, parentSlug: 'parent1', order: 1 }]
      vi.mocked(category.find).mockReturnValue({
        sort: vi.fn().mockResolvedValue(mockData)
      } as any)
      const result = await categoryModel.getCategoriesByParentSlug({ user: mockUserId, parentSlug: 'parent1' })
      expect(category.find).toHaveBeenCalledWith({ user: mockUserObjectId, parentSlug: 'parent1' })
      expect(result).toEqual(mockData)
    })

    it('devuelve error si no existen categorías para el parent', async () => {
      vi.mocked(category.find).mockReturnValue({ sort: vi.fn().mockResolvedValue([]) } as any)
      const result = await categoryModel.getCategoriesByParentSlug({ user: mockUserId, parentSlug: 'parentX' })
      expect(result).toEqual({ error: 'La category no existe' })
    })
  })

  describe('getCategoryCount', () => {
    it('devuelve el número de categorías si hay', async () => {
      vi.mocked(category.find).mockReturnValue({
        countDocuments: vi.fn().mockResolvedValue(3)
      } as any)
      const result = await categoryModel.getCategoryCount({ user: mockUserId })
      expect(category.find).toHaveBeenCalledWith({ user: mockUserObjectId })
      expect(result).toBe(3)
    })

    it('devuelve error si no hay categorías', async () => {
      vi.mocked(category.find).mockReturnValue({
        countDocuments: vi.fn().mockResolvedValue(0)
      } as any)
      const result = await categoryModel.getCategoryCount({ user: mockUserId })
      expect(result).toEqual({ error: 'No se encuentran columnas para este usuario' })
    })
  })

  describe('createCategory', () => {
    it('crea una categoría correctamente', async () => {
      const mockCategory = { name: 'Nueva', order: 1 }
      const mockSlug = 'nueva'
      const mockCreated = { _id: mockCategoryId, user: mockUserId, ...mockCategory, slug: mockSlug }
      vi.spyOn(categoryModel, 'generateUniqueSlug').mockResolvedValue(mockSlug)
      vi.mocked(category.create).mockResolvedValue(mockCreated as any)
      const result = await categoryModel.createCategory({ user: mockUserId, fields: mockCategory })
      expect(result).toEqual([mockCreated])
    })

    it('lanza error si el nombre está vacío', async () => {
      await expect(categoryModel.createCategory({ user: mockUserId, fields: { name: '' } })).rejects.toThrow('Category name is required to generate a slug')
    })
  })

  describe('updateCategory', () => {
    beforeEach(() => {
      vi.spyOn(categoryModel, 'setColumnsOrder').mockResolvedValue({ error: '' })
      vi.spyOn(categoryModel, 'generateUniqueSlug').mockResolvedValue('mocked-slug')
    })

    it('actualiza el nombre y el slug de una columna', async () => {
      const updatedData = { _id: mockCategoryId, name: 'Updated Name', slug: 'updated-name' }
      vi.spyOn(categoryModel, 'generateUniqueSlug').mockResolvedValue('updated-name')
      vi.mocked(category.findOneAndUpdate).mockResolvedValue(updatedData as any)
      vi.mocked(link.updateMany).mockResolvedValue({} as any)

      const result = await categoryModel.updateCategory({ updates: [{ user: mockUserId, id: mockCategoryId, fields: { name: 'Updated Name' } }] })

      expect(categoryModel.generateUniqueSlug).toHaveBeenCalledWith({ user: mockUserId, name: 'Updated Name' })
      expect(category.findOneAndUpdate).toHaveBeenCalledWith({ _id: mockCategoryObjectId, user: mockUserObjectId }, { $set: { name: 'Updated Name', slug: 'updated-name' } }, { new: true })
      expect(result).toEqual([updatedData])
    })

    it('mueve una columna a otro escritorio y actualiza el orden', async () => {
      const movedData = { _id: mockCategoryId, parentId: mockParentId, order: 1 }
      vi.mocked(category.find).mockResolvedValue([{ _id: 'anotherCol' }] as any)
      vi.mocked(category.findOneAndUpdate).mockResolvedValue(movedData as any)
      vi.mocked(link.updateMany).mockResolvedValue({} as any)

      const result = await categoryModel.updateCategory({ updates: [{ user: mockUserId, id: mockCategoryId, fields: { parentId: mockParentId, order: 1 } }] })

      expect(category.findOneAndUpdate).toHaveBeenCalledWith({ _id: mockCategoryObjectId, user: mockUserObjectId }, { $set: { parentId: mockParentId, order: 1 } }, { new: true })
      expect(result).toEqual([movedData])
    })

    it('devuelve un error si la columna a actualizar no se encuentra', async () => {
      vi.mocked(category.findOneAndUpdate).mockResolvedValue(null)
      const result = await categoryModel.updateCategory({ updates: [{ user: mockUserId, id: mockCategoryId, fields: { name: 'Nonexistent' } }] })
      expect(result).toEqual([{ id: mockCategoryId, error: 'La categoría no existe' }])
    })
  })

  describe('deleteCategory', () => {
    it('elimina una columna y sus links asociados', async () => {
      const columnToDelete = { _id: mockCategoryId, name: 'ToDelete', parentId: mockParentObjectId }
      vi.mocked(category.findOne).mockResolvedValue(columnToDelete as any)
      vi.mocked(link.deleteMany).mockResolvedValue({} as any)
      vi.mocked(category.deleteOne).mockResolvedValue({} as any)
      vi.mocked(category.find).mockReturnValue({ sort: vi.fn().mockResolvedValue([]) } as any)
      vi.spyOn(categoryModel, 'setColumnsOrder').mockResolvedValue({ error: '' })

      const result = await categoryModel.deleteCategory({ user: mockUserId, id: mockCategoryId, level: 1 })

      expect(category.findOne).toHaveBeenCalledWith({ _id: mockCategoryObjectId, user: mockUserObjectId })
      expect(link.deleteMany).toHaveBeenCalledWith({ categoryId: mockCategoryObjectId, user: mockUserObjectId })
      expect(category.deleteOne).toHaveBeenCalledWith({ _id: mockCategoryObjectId, user: mockUserObjectId })
      expect(categoryModel.setColumnsOrder).toHaveBeenCalledWith({ user: mockUserId, elements: [] })
      expect(result).toEqual(columnToDelete)
    })
  })
})
