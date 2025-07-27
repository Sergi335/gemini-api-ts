import { z } from 'zod'

const categoryZodSchema = z.object({
  _id: z.string().optional(),
  name: z.string({
    required_error: 'Name is required',
    invalid_type_error: 'Name must be a string'
  }).min(1, 'Name must have at least 1 character').max(250, 'Name must not exceed 250 characters').optional(),
  parentId: z.string({
    invalid_type_error: 'ParentId must be a string'
  }).min(1, 'ParentId must have at least 1 character').max(250, 'ParentId must not exceed 250 characters').optional(),
  isEmpty: z.boolean({
    invalid_type_error: 'isEmpty must be a boolean'
  }).optional(),
  order: z.number({
    invalid_type_error: 'Order must be a number'
  }).int('Order must be an integer').min(0, 'Order must be non-negative').optional(),
  user: z.string({
    required_error: 'User is required',
    invalid_type_error: 'User must be a string'
  }).min(1, 'User must have at least 1 character').max(250, 'User must not exceed 250 characters'),
  slug: z.string({
    invalid_type_error: 'Slug must be a string'
  }).min(1, 'Slug must have at least 1 character').max(250, 'Slug must not exceed 250 characters').optional(),
  hidden: z.boolean({
    invalid_type_error: 'Hidden must be a boolean'
  }).optional().default(false),
  displayName: z.string({
    invalid_type_error: 'DisplayName must be a string'
  }).min(1, 'DisplayName must have at least 1 character').max(250, 'DisplayName must not exceed 250 characters').optional()
})

// Esquema para crear categoría (requiere campos obligatorios)
const createCategoryZodSchema = categoryZodSchema.pick({
  name: true,
  user: true,
  parentId: true
}).extend({
  name: z.string({
    required_error: 'Name is required',
    invalid_type_error: 'Name must be a string'
  }).min(1, 'Name must have at least 1 character').max(250, 'Name must not exceed 250 characters'),
  parentId: z.string({
    required_error: 'ParentId is required',
    invalid_type_error: 'ParentId must be a string'
  }).min(1, 'ParentId must have at least 1 character').max(250, 'ParentId must not exceed 250 characters')
})

// Esquema para actualizar categoría (todos los campos opcionales excepto user si se incluye)
const updateCategoryZodSchema = categoryZodSchema.partial().extend({
  user: z.string({
    required_error: 'User is required when provided',
    invalid_type_error: 'User must be a string'
  }).min(1, 'User must have at least 1 character').max(250, 'User must not exceed 250 characters').optional()
})

// Tipos inferidos de los esquemas
export type CategorySchema = z.infer<typeof categoryZodSchema>
export type CreateCategorySchema = z.infer<typeof createCategoryZodSchema>
export type UpdateCategorySchema = z.infer<typeof updateCategoryZodSchema>

// Funciones de validación con tipos correctos
export function validateCategory (category: unknown): z.SafeParseReturnType<unknown, CategorySchema> {
  return categoryZodSchema.safeParse(category)
}

export function validateCreateCategory (category: unknown): z.SafeParseReturnType<unknown, CreateCategorySchema> {
  return createCategoryZodSchema.safeParse(category)
}

export function validateUpdateCategory (category: unknown): z.SafeParseReturnType<unknown, UpdateCategorySchema> {
  return updateCategoryZodSchema.safeParse(category)
}

export function validatePartialCategory (category: unknown): z.SafeParseReturnType<unknown, Partial<CategorySchema>> {
  return categoryZodSchema.partial().safeParse(category)
}
