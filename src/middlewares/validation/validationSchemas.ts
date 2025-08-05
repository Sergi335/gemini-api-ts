import { z } from 'zod'

// Category schemas (compatibles con los existentes)
export const createCategoryBodySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  parentId: z.string().optional(),
  order: z.number().int().min(0).optional(),
  hidden: z.boolean().optional(),
  displayName: z.string().optional(),
  user: z.string().optional() // Se añade en el controlador
})

export const updateCategoryBodySchema = z.object({
  fields: z.object({
    name: z.string().min(1).optional(),
    parentId: z.string().optional(),
    order: z.number().int().min(0).optional(),
    hidden: z.boolean().optional(),
    displayName: z.string().optional(),
    parentSlug: z.string().optional() // Nuevo campo para slug
  }),
  id: z.string().min(1, 'ID de categoría requerido'),
  columnsIds: z.array(z.string()).optional()
})

export const deleteCategoryBodySchema = z.object({
  id: z.string().min(1, 'ID de categoría requerido')
})

// Nesting categories schema
export const nestingCategoriesBodySchema = z.object({
  updates: z.array(
    z.object({
      itemId: z.string().min(1, 'ItemId es requerido'),
      newOrder: z.number().int().min(0, 'newOrder debe ser un número entero no negativo'),
      newLevel: z.number().int().min(0, 'newLevel debe ser un número entero no negativo'),
      parentId: z.string().nullable().optional()
    })
  ).min(1, 'Debe proporcionar al menos una categoría para actualizar')
})

// Reordering categories schema
export const reorderingCategoriesBodySchema = z.object({
  updates: z.array(
    z.object({
      itemId: z.string().min(1, 'ItemId es requerido'),
      newOrder: z.number().int().min(0, 'newOrder debe ser un número entero no negativo'),
      newLevel: z.number().int().min(0, 'newLevel debe ser un número entero no negativo'),
      parentId: z.string().nullable().optional(),
      parentSlug: z.string().optional() // Nuevo campo para slug
    })
  ).min(1, 'Debe proporcionar al menos una categoría para reordenar')
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
  id: z.string().min(1, 'ID de link requerido'),
  fields: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    url: z.string().url().optional(),
    imgUrl: z.string().url().optional(),
    categoryId: z.string().optional(),
    order: z.number().int().min(0).optional(),
    notes: z.string().optional(),
    bookmark: z.boolean().optional()
  }).optional(),
  oldCategoryId: z.string().optional(),
  newCategoryId: z.string().optional()
})

export const deleteLinkBodySchema = z.object({
  linkId: z.string().min(1, 'ID de link requerido')
})

// Auth schemas
export const loginBodySchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional(),
  idToken: z.string().optional(),
  csrfToken: z.string().optional(),
  uid: z.string().optional()
})

export const registerBodySchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
})

export const updateUserBodySchema = z.object({
  email: z.string().email('Email inválido'),
  fields: z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    profileImage: z.string().url().optional(),
    website: z.string().url().optional(),
    aboutMe: z.string().max(500).optional()
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
  imageName: z.string().min(1, 'Nombre de imagen requerido')
})
