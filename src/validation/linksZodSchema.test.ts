import { describe, it, expect } from 'vitest'
import {
  validateLink,
  validatePartialLink,
  type Link,
  type PartialLink
} from './linksZodSchema'

describe('linksZodSchema', () => {
  describe('validateLink', () => {
    it('valida correctamente un link completo', () => {
      const validLinkData = {
        name: 'Mi Link',
        url: 'https://example.com',
        categoryId: 'category123',
        user: 'user123',
        description: 'Descripción del link',
        bookmark: false,
        readlist: true,
        images: ['image1.jpg', 'image2.png']
      }

      const result = validateLink(validLinkData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Mi Link')
        expect(result.data.url).toBe('https://example.com')
        expect(result.data.categoryId).toBe('category123')
        expect(result.data.user).toBe('user123')
        expect(result.data.bookmark).toBe(false)
        expect(result.data.readlist).toBe(true)
        expect(result.data.images).toEqual(['image1.jpg', 'image2.png'])
      }
    })

    it('valida un link con campos mínimos', () => {
      const minimalLinkData = {
        name: 'Link mínimo'
      }

      const result = validateLink(minimalLinkData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Link mínimo')
        expect(result.data.description).toBe('Description') // valor por defecto
        expect(result.data.bookmark).toBe(false) // valor por defecto
        expect(result.data.bookmarkOrder).toBe(0) // valor por defecto
        expect(result.data.readlist).toBe(false) // valor por defecto
      }
    })

    it('valida un link con todos los campos opcionales', () => {
      const fullLinkData = {
        name: 'Link completo',
        description: 'Descripción personalizada',
        url: 'https://full-example.com',
        imgUrl: 'https://example.com/image.jpg',
        categoryName: 'Mi Categoría',
        categoryId: 'cat456',
        order: 5,
        user: 'usuario123',
        notes: 'Notas importantes',
        images: ['img1.png', 'img2.jpg'],
        bookmark: true,
        bookmarkOrder: 3,
        readlist: true
      }

      const result = validateLink(fullLinkData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Link completo')
        expect(result.data.description).toBe('Descripción personalizada')
        expect(result.data.order).toBe(5)
        expect(result.data.bookmarkOrder).toBe(3)
      }
    })

    it('maneja tipos incorrectos graciosamente', () => {
      const invalidLinkData = {
        name: 123, // debería ser string
        bookmark: 'yes', // debería ser boolean
        order: 'cinco' // debería ser number
      }

      const result = validateLink(invalidLinkData)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0)
      }
    })
  })

  describe('validatePartialLink', () => {
    it('permite validación parcial con algunos campos', () => {
      const partialData = {
        name: 'Solo nombre',
        bookmark: true
      }

      const result = validatePartialLink(partialData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Solo nombre')
        expect(result.data.bookmark).toBe(true)
      }
    })

    it('permite objeto vacío', () => {
      const emptyData = {}

      const result = validatePartialLink(emptyData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(Object.keys(result.data).length).toBe(0)
      }
    })

    it('permite actualizar solo la URL', () => {
      const urlOnlyData = {
        url: 'https://new-url.com'
      }

      const result = validatePartialLink(urlOnlyData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.url).toBe('https://new-url.com')
      }
    })

    it('permite actualizar estados de bookmark y readlist', () => {
      const statusUpdateData = {
        bookmark: true,
        bookmarkOrder: 10,
        readlist: false
      }

      const result = validatePartialLink(statusUpdateData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.bookmark).toBe(true)
        expect(result.data.bookmarkOrder).toBe(10)
        expect(result.data.readlist).toBe(false)
      }
    })

    it('maneja tipos incorrectos en validación parcial', () => {
      const invalidPartialData = {
        bookmark: 'invalid', // debería ser boolean
        order: 'not-a-number' // debería ser number
      }

      const result = validatePartialLink(invalidPartialData)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0)
      }
    })
  })

  describe('Type inference', () => {
    it('infiere tipos correctamente', () => {
      const linkData: Link = {
        name: 'Full Link',
        description: 'Full description',
        bookmark: false,
        bookmarkOrder: 0,
        readlist: false
      }

      const partialData: PartialLink = {
        bookmark: true,
        name: 'Partial update'
      }

      expect(linkData.name).toBe('Full Link')
      expect(partialData.bookmark).toBe(true)
      expect(partialData.name).toBe('Partial update')
    })
  })
})
