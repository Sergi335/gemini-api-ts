import mongoose, { Types } from 'mongoose'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { categoryModel } from './categoryModel'
import category from './schemas/categorySchema'
import link from './schemas/linkSchema'

vi.mock('./schemas/categorySchema')
vi.mock('./schemas/linkSchema')

describe('categoryModel.getAllCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devuelve categorías del usuario', async () => {
    const mockData = [{ name: 'cat1', user: 'user1', order: 1 }]
    // @ts-expect-error
    category.find.mockImplementation(({ user }) => ({
      sort: vi.fn().mockResolvedValue(user === 'user1' ? mockData : [])
    }))
    const result = await categoryModel.getAllCategories({ userId: 'user1' })
    expect(result).toEqual(mockData)
  })

  it('devuelve array vacío si no hay categorías', async () => {
    // @ts-expect-error
    category.find.mockImplementation(({ user }) => ({
      sort: vi.fn().mockResolvedValue(user === 'user2' ? [] : [{ name: 'cat1', user: 'user1', order: 1 }])
    }))
    const result = await categoryModel.getAllCategories({ userId: 'user2' })
    expect(result).toEqual([])
  })
})

describe('categoryModel.getCategoryByParent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devuelve categorías si existen para el parent', async () => {
    const mockData = [{ name: 'cat2', user: 'user1', parentId: 'parent1', order: 1 }]
    // @ts-expect-error
    category.find.mockImplementation(({ user, parentId }) => ({
      sort: vi.fn().mockResolvedValue(user === 'user1' && parentId === 'parent1' ? mockData : [])
    }))
    const result = await categoryModel.getCategoriesByParentSlug({ userId: 'user1', parentSlug: 'parent1' })
    expect(result).toEqual(mockData)
  })

  it('devuelve error si no existen categorías para el parent', async () => {
    // @ts-expect-error
    category.find.mockImplementation(() => ({ sort: vi.fn().mockResolvedValue([]) }))
    const result = await categoryModel.getCategoriesByParentSlug({ userId: 'user1', parentSlug: 'parentX' })
    expect(result).toEqual({ error: 'La category no existe' })
  })
})

describe('categoryModel.getCategoryCount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devuelve el número de categorías si hay', async () => {
    // @ts-expect-error
    category.find.mockImplementation(({ user }) => ({
      countDocuments: vi.fn().mockResolvedValue(user === 'user1' ? 3 : 0)
    }))
    const result = await categoryModel.getCategoryCount({ userId: 'user1' })
    expect(result).toBe(3)
  })

  it('devuelve error si no hay categorías', async () => {
    // @ts-expect-error
    category.find.mockImplementation(({ user }) => ({
      countDocuments: vi.fn().mockResolvedValue(user === 'user2' ? 0 : 3)
    }))
    const result = await categoryModel.getCategoryCount({ userId: 'user2' })
    expect(result).toEqual({ error: 'No se encuentran columnas para este usuario' })
  })
})

describe('categoryModel.createCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('crea una categoría correctamente', async () => {
    const mockCategory = { name: 'Nueva', order: 1 }
    const mockSlug = 'nueva'
    const mockCreated = { _id: 'id1', user: 'user1', name: 'Nueva', order: 1, slug: mockSlug }
    // Mock slug
    vi.spyOn(categoryModel, 'generateUniqueSlug').mockResolvedValue(mockSlug)
    // Mock create
    // @ts-expect-error
    category.create.mockResolvedValue(mockCreated)
    const result = await categoryModel.createCategory({ userId: 'user1', cleanData: mockCategory })
    expect(result).toEqual([mockCreated])
  })

  it('lanza error si el nombre está vacío', async () => {
    await expect(categoryModel.createCategory({ userId: 'user1', cleanData: { name: '' } })).rejects.toThrow('Category name is required to generate a slug')
  })
})

describe('categoryModel.updateCategory', () => {
  const mockSession = {
    startTransaction: vi.fn(),
    commitTransaction: vi.fn().mockResolvedValue(true),
    abortTransaction: vi.fn().mockResolvedValue(true),
    endSession: vi.fn().mockResolvedValue(true)
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // @ts-expect-error
    vi.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession)
    vi.spyOn(categoryModel, 'setColumnsOrder').mockResolvedValue({ error: '' })
    vi.spyOn(categoryModel, 'generateUniqueSlug').mockResolvedValue('mocked-slug')
  })

  it('actualiza el nombre y el slug de una columna', async () => {
    const updatedData = { _id: 'col1', name: 'Updated Name', slug: 'updated-name' }
    vi.spyOn(categoryModel, 'generateUniqueSlug').mockResolvedValue('updated-name')
    // @ts-expect-error
    category.findOneAndUpdate.mockReturnValue({ session: vi.fn().mockResolvedValue(updatedData) })
    // @ts-expect-error
    link.updateMany.mockReturnValue({ session: vi.fn().mockResolvedValue({ acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0, upsertedId: new Types.ObjectId() }) })
    const result = await categoryModel.updateCategory({ userId: 'user1', id: 'col1', cleanData: { name: 'Updated Name' } })
    expect(categoryModel.generateUniqueSlug).toHaveBeenCalledWith({ userId: 'user1', name: 'Updated Name' })
    expect(category.findOneAndUpdate).toHaveBeenCalledWith({ _id: 'col1', user: 'user1' }, { $set: { name: 'Updated Name', slug: 'updated-name' } }, { new: true })
    expect(link.updateMany).toHaveBeenCalledWith({ idpanel: 'col1', user: 'user1' }, { $set: { panel: 'Updated Name' } })
    expect(mockSession.commitTransaction).toHaveBeenCalled()
    expect(result).toEqual(updatedData)
  })

  it('mueve una columna a otro escritorio y actualiza el orden', async () => {
    const movedData = { _id: 'col1', parentId: 'desk2', order: 1 }
    // @ts-expect-error
    category.find.mockResolvedValue([{ _id: 'anotherCol' }])
    // @ts-expect-error
    category.findOneAndUpdate.mockReturnValue({ session: vi.fn().mockResolvedValue(movedData) })
    // @ts-expect-error
    link.updateMany.mockReturnValue({ session: vi.fn().mockResolvedValue({ acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0, upsertedId: new Types.ObjectId() }) })
    const result = await categoryModel.updateCategory({ userId: 'user1', id: 'col1', cleanData: { parentId: 'desk2' } })
    expect(category.find).toHaveBeenCalledWith({ parentId: 'desk2', user: 'user1' })
    expect(category.findOneAndUpdate).toHaveBeenCalledWith({ _id: 'col1', user: 'user1' }, { $set: { parentId: 'desk2', order: 1 } }, { new: true })
    expect(link.updateMany).toHaveBeenCalledWith({ idpanel: 'col1', user: 'user1' }, { $set: { parentId: 'desk2' } })
    expect(mockSession.commitTransaction).toHaveBeenCalled()
    expect(result).toEqual(movedData)
  })

  it('devuelve un error si la columna a actualizar no se encuentra', async () => {
    // @ts-expect-error
    category.findOneAndUpdate.mockReturnValue({ session: vi.fn().mockResolvedValue(null) })
    // @ts-expect-error
    link.updateMany.mockReturnValue({ session: vi.fn().mockResolvedValue({ acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0, upsertedId: new Types.ObjectId() }) })
    const result = await categoryModel.updateCategory({ userId: 'user1', id: 'nonexistent', cleanData: { name: 'any' } })
    expect(result).toEqual({ error: 'La columna no existe' })
    expect(mockSession.commitTransaction).toHaveBeenCalled()
  })

  it('maneja errores durante la transacción y hace abort', async () => {
    const dbError = new Error('DB fail')
    // @ts-expect-error
    category.findOneAndUpdate.mockReturnValue({ session: vi.fn().mockRejectedValue(dbError) })
    // @ts-expect-error
    link.updateMany.mockReturnValue({ session: vi.fn().mockResolvedValue({ acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0, upsertedId: new Types.ObjectId() }) })
    const result = await categoryModel.updateCategory({ userId: 'user1', id: 'col1', cleanData: { name: 'any' } })
    expect(mockSession.abortTransaction).toHaveBeenCalled()
    expect(mockSession.commitTransaction).not.toHaveBeenCalled()
    expect(result).toEqual({ error: 'DB fail' })
  })
})

describe('categoryModel.deleteCategory', () => {
  const mockSession = {
    startTransaction: vi.fn(),
    commitTransaction: vi.fn().mockResolvedValue(true),
    abortTransaction: vi.fn().mockResolvedValue(true),
    endSession: vi.fn().mockResolvedValue(true)
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // @ts-expect-error
    vi.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession)
    vi.spyOn(categoryModel, 'setColumnsOrder').mockResolvedValue({ error: '' })
    vi.spyOn(categoryModel, 'generateUniqueSlug').mockResolvedValue('mocked-slug')
  })

  it('elimina una columna y sus links asociados', async () => {
    const columnToDelete = { _id: 'col1', name: 'ToDelete', parentId: 'desk1' }
    // @ts-expect-error
    category.findOne.mockReturnValue({ session: vi.fn().mockResolvedValue(columnToDelete) })
    // @ts-expect-error
    link.deleteMany.mockReturnValue({ session: vi.fn().mockResolvedValue({ acknowledged: true, deletedCount: 5 }) })
    // @ts-expect-error
    category.deleteOne.mockReturnValue({ session: vi.fn().mockResolvedValue({ acknowledged: true, deletedCount: 1 }) })
    // @ts-expect-error
    category.find.mockReturnValue({ sort: vi.fn().mockResolvedValue([]) })
    const result = await categoryModel.deleteCategory({ userId: 'user1', id: 'col1' })
    expect(category.findOne).toHaveBeenCalledWith({ _id: 'col1', user: 'user1' })
    expect(link.deleteMany).toHaveBeenCalledWith({ idpanel: 'col1', user: 'user1' })
    expect(category.deleteOne).toHaveBeenCalledWith({ _id: 'col1', user: 'user1' })
    expect(mockSession.commitTransaction).toHaveBeenCalled()
    expect(categoryModel.setColumnsOrder).toHaveBeenCalledWith({ user: 'user1', elementos: [], parentId: 'desk1' })
    expect(result).toEqual(columnToDelete)
  })
})
