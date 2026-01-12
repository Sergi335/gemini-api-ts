import { z } from 'zod'

// Category schemas (compatibles con los existentes)
export const createCategoryBodySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  parentId: z.string().optional(),
  order: z.number().int().min(0).optional(),
  level: z.number().int().min(0).optional()
})

export const updateCategoryBodySchema = z.object({
  updates: z.array(z.object({
    id: z.string().min(1, 'ID de categoría requerido'),
    oldParentId: z.string().optional(),
    fields: z.object({
      name: z.string().min(1).optional(),
      parentId: z.string().nullable().optional(),
      order: z.number().int().min(0).optional(),
      hidden: z.boolean().optional(),
      displayName: z.string().optional(),
      parentSlug: z.string().nullable().optional(),
      isEmpty: z.boolean().optional(),
      level: z.number().min(0).optional()
    }).partial()
  }))
})

export const deleteCategoryBodySchema = z.object({
  id: z.string().min(1, 'ID de categoría requerido'),
  level: z.number().int().min(0).optional()
})

// Params schemas
export const categoryParamsSchema = z.object({
  id: z.string().min(1, 'ID de categoría requerido')
})

// Link schemas
export const createLinkBodySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  url: z.string().url('URL inválida'),
  imgUrl: z.string().url().optional(),
  categoryId: z.string().min(1, 'ID de categoría requerido'),
  order: z.number().int().min(0).optional(),
  notes: z.string().optional(),
  bookmark: z.boolean().optional()
})

export const updateLinkBodySchema = z.object({
  updates: z.array(z.object({
    id: z.string().min(1, 'ID de link requerido'),
    oldCategoryId: z.string().optional(),
    fields: z.object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      url: z.string().url().optional(),
      imgUrl: z.string().url().optional(),
      categoryId: z.string().optional(),
      order: z.number().int().min(0).optional(),
      notes: z.record(z.object({}).passthrough()).optional(),
      bookmark: z.boolean().optional(),
      extractedArticle: z.null().optional(),
      type: z.enum(['video', 'article', 'general', 'note']).optional(),
      summary: z.string().nullable().optional(),
      transcript: z.string().nullable().optional(),
      chatHistory: z.array(z.object({
        role: z.enum(['user', 'model']),
        content: z.string()
      })).nullable().optional()
    }).partial(),
    destinyIds: z.array(z.object({
      id: z.string().min(1, 'ID de destino requerido'),
      order: z.number().min(0, 'El orden debe ser un número entero no negativo'),
      name: z.string().optional(),
      categoryId: z.string()
    })).optional(),
    previousIds: z.array(z.object({
      id: z.string().min(1, 'ID de destino requerido'),
      order: z.number().min(0, 'El orden debe ser un número entero no negativo'),
      name: z.string().optional(),
      categoryId: z.string()
    })).optional()
  }))
})

export const deleteLinkBodySchema = z.object({
  linkId: z.union([
    z.string().min(1, 'ID de link requerido'),
    z.array(z.string().min(1, 'ID de link requerido')).min(1, 'Debe proporcionar al menos un link')
  ])
})

// Auth schemas
export const loginBodySchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional(),
  idToken: z.string().optional(),
  uid: z.string().optional()
})

export const registerBodySchema = z.object({
  nickname: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  csrfToken: z.string().optional(),
  email: z.string().email('Email inválido'),
  idToken: z.string(),
  uid: z.string().optional()
})

export const updateUserBodySchema = z.object({
  email: z.string().email('Email inválido'),
  fields: z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    profileImage: z.string().url().optional(),
    website: z.string().optional(),
    aboutMe: z.string().max(500).optional(),
    realName: z.string().min(2).optional(),
    lastBackupUrl: z.string().optional(),
    weatherCity: z.string().optional()
  })
})

// Query schemas comunes
export const paginationQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  search: z.string().optional(),
  category: z.string().optional(),
  categoryId: z.string().optional()
})

// Storage schemas
export const uploadImageBodySchema = z.object({
  linkId: z.string().min(1, 'ID de link requerido')
})

export const deleteImageBodySchema = z.object({
  id: z.string().min(1, 'ID de imagen requerido'),
  image: z.string().min(1, 'URL de imagen requerida')
})
