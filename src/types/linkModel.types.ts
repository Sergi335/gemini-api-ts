// Tipos específicos para operaciones de Links

// Datos limpios de link sin el campo user para respuestas
export type LinkCleanData = Omit<{
  _id?: string
  name?: string
  description?: string
  url?: string
  imgUrl?: string
  categoryName?: string
  categoryId?: string
  order?: number
  notes?: string
  images?: string[]
  bookmark?: boolean
  bookmarkOrder?: number
  readlist?: boolean
  createdAt?: Date
  updatedAt?: Date
}, 'user'>

// Respuesta exitosa para operaciones de movimiento de links
export interface MoveLinkResponse {
  success: boolean
  message: string
  data?: LinkCleanData
}

// Respuesta de error para operaciones de links
export interface LinkErrorResponse {
  success: false
  error: string
  details?: string
}

// Tipo para respuesta de conteo de links
export interface LinkCountResponse {
  count: number
  category?: string
}

// Tipo para operaciones de bookmark
export interface BookmarkUpdateData {
  bookmark: boolean
  bookmarkOrder?: number
}

// Tipo para operaciones de readlist
export interface ReadlistUpdateData {
  readlist: boolean
}
