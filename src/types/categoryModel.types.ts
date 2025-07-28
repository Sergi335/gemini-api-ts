export type CategoryCleanData = Omit<{
  name?: string
  parentId?: string
  isEmpty?: boolean
  order?: number
  hidden?: boolean
  displayName?: string
  slug?: string
  level?: number
}, 'user'>

export interface MoveCategoryResponse {
  response: {
    length: number
    message: string
  }
}

export interface CategoryErrorResponse {
  error: string
}
