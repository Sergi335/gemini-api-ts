import { describe, it, expect, vi, beforeEach } from 'vitest'
import category from './schemas/categorySchema'
import { columnModel } from './categoryModel'

vi.mock('./schemas/categorySchema')

describe('columnModel.getAllCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devuelve categorías del usuario', async () => {
    const mockData = [{ name: 'cat1', user: 'user1', order: 1 }]
    // @ts-expect-error
    category.find.mockImplementation(({ user }) => ({
      sort: vi.fn().mockResolvedValue(user === 'user1' ? mockData : [])
    }))
    const result = await columnModel.getAllCategories({ user: 'user1' })
    expect(result).toEqual(mockData)
  })

  it('devuelve array vacío si no hay categorías', async () => {
    // @ts-expect-error
    category.find.mockImplementation(({ user }) => ({
      sort: vi.fn().mockResolvedValue(user === 'user2' ? [] : [{ name: 'cat1', user: 'user1', order: 1 }])
    }))
    const result = await columnModel.getAllCategories({ user: 'user2' })
    expect(result).toEqual([])
  })
})
