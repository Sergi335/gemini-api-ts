import { z } from 'zod'

// Esquema base para Link que refleja la estructura de MongoDB
const baseLinkSchema = z.object({
  name: z.string().optional(),
  description: z.string().default('Description'),
  url: z.string().optional(),
  imgUrl: z.string().optional(),
  categoryName: z.string().optional(),
  categoryId: z.string().optional(),
  order: z.number().optional(),
  user: z.string().optional(),
  notes: z.string().optional(),
  images: z.array(z.string()).optional(),
  bookmark: z.boolean().default(false),
  bookmarkOrder: z.number().default(0),
  readlist: z.boolean().default(false)
})

// Esquema para validación parcial (permite campos vacíos)
const partialLinkSchema = baseLinkSchema.partial()

// Inferencia de tipos TypeScript desde los esquemas Zod
export type Link = z.infer<typeof baseLinkSchema>
export type PartialLink = z.infer<typeof partialLinkSchema>

// Función para validar un link completo (usado en createLink)
export function validateLink (data: unknown): {
  success: true
  data: Link
} | {
  success: false
  error: z.ZodError
} {
  const result = baseLinkSchema.safeParse(data)
  return result
}

// Función para validar datos parciales de link (usado en updateLink)
export function validatePartialLink (data: unknown): {
  success: true
  data: PartialLink
} | {
  success: false
  error: z.ZodError
} {
  const result = partialLinkSchema.safeParse(data)
  return result
}

// Exportar esquemas para uso directo si es necesario
export {
  baseLinkSchema,
  partialLinkSchema
}
