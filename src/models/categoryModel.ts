import mongoose from 'mongoose'
import type {
  CategoryErrorResponse
} from '../types/categoryModel.types'
import category from './schemas/categorySchema'
import link from './schemas/linkSchema'

export interface CategoryFields {
  name?: string
  slug?: string
  description?: string
  parentId?: string
  order?: number
  isEmpty?: boolean
  parentSlug?: string
  hidden?: boolean
  displayName?: string
  level?: number
  id?: string
  // user: string
}
export interface ValidatedCategoryData extends CategoryFields {
  user: string
  fields?: CategoryFields
  elements?: CategoryFields[]
}
export interface NewValidatedCategoryData extends CategoryFields {
  updates: ValidatedCategoryData[]
}

/* eslint-disable @typescript-eslint/no-extraneous-class */
export class categoryModel {
  static async getAllCategories ({ user }: ValidatedCategoryData): Promise<mongoose.Document[] | []> {
    const objectIdUser = new mongoose.Types.ObjectId(user)
    const data = await category.find({ user: objectIdUser }).sort({ order: 1 })

    if (data.length > 0) {
      return data
    } else {
      return []
    }
  }

  static async getTopLevelCategories ({ user }: ValidatedCategoryData): Promise<mongoose.Document[]> {
    const objectIdUser = new mongoose.Types.ObjectId(user)
    const data = await category.find({ user: objectIdUser, level: 0 }).sort({ order: 1 })
    return data
  }

  static async getCategoriesByParentSlug ({ user, parentSlug }: ValidatedCategoryData): Promise<mongoose.Document[] | CategoryErrorResponse> {
    const objectIdUser = new mongoose.Types.ObjectId(user)
    const data = await category.find({ user: objectIdUser, parentSlug }).sort({ order: 1 })
    if (data.length > 0) {
      return data
    } else {
      return { error: 'La category no existe' }
    }
  }

  static async getCategoryCount ({ user }: ValidatedCategoryData): Promise<number | CategoryErrorResponse> {
    const objectIdUser = new mongoose.Types.ObjectId(user)
    const data = await category.find({ user: objectIdUser }).countDocuments()
    if (data > 0) {
      return data
    } else {
      return { error: 'No se encuentran columnas para este usuario' }
    }
  }

  static async createCategory ({ user, fields }: ValidatedCategoryData): Promise<mongoose.Document[]> {
    if (fields?.name == null || fields?.name.trim() === '') {
      throw new Error('Category name is required to generate a slug')
    }
    const objectIdUser = new mongoose.Types.ObjectId(user)
    // Usar el slug proporcionado en fields si existe, de lo contrario generar uno nuevo
    const slug = fields.slug ?? await this.generateUniqueSlug({ user, name: fields.name })
    const data = await category.create({ user: objectIdUser, ...fields, slug })
    return [data]
  }

  static async updateCategory ({ updates }: NewValidatedCategoryData): Promise<Array<mongoose.Document | { id: string | undefined, error: string }> | CategoryErrorResponse> {
    try {
      const updatedData = []
      for (const update of updates) {
        const { user, id, fields } = update
        const userObjectId = new mongoose.Types.ObjectId(user)
        const objectId = new mongoose.Types.ObjectId(id)
        if (fields?.name !== undefined) {
          const slug = await this.generateUniqueSlug({ user, name: fields.name })
          fields.slug = slug
        }
        const result = await category.findOneAndUpdate({ _id: objectId, user: userObjectId }, { $set: { ...fields } }, { new: true })
        if (result === null) {
          updatedData.push({ id: id ?? undefined, error: 'La categoría no existe' })
        } else {
          updatedData.push(result)
        }
      }
      return updatedData
    } catch (error) {
      return { error: (error as Error).message }
    }
  }

  static async deleteCategory ({ user, id, level }: ValidatedCategoryData): Promise<mongoose.Document | CategoryErrorResponse | { success: boolean, deletedCount: string }> {
    const userObjectId = new mongoose.Types.ObjectId(user)
    const categoryObjectId = new mongoose.Types.ObjectId(id)
    try {
      if (level === 0) {
        const resTopLevelCategories = await category.deleteOne({ _id: categoryObjectId, user: userObjectId })
        const resTopLevelLinks = await link.deleteMany({ categoryId: categoryObjectId, user: userObjectId })
        const subcategories = await category.find({ parentId: categoryObjectId, user: userObjectId })
        const resSubcategoriesLinks = []
        for (const subcategory of subcategories) {
          const result = await link.deleteMany({ categoryId: new mongoose.Types.ObjectId(subcategory._id), user: userObjectId })
          resSubcategoriesLinks.push(result)
        }
        const resSubcategories = await category.deleteMany({ parentId: categoryObjectId, user: userObjectId })

        return {
          success: true,
          deletedCount: `Categorías: ${resSubcategories.deletedCount}` + `, Escritorios: ${resTopLevelCategories.deletedCount}` + `, Links: ${resTopLevelLinks.deletedCount}` + `, Links Subcategorías: ${resSubcategoriesLinks.reduce((acc, curr) => acc + curr.deletedCount, 0)}`
        }
      }
      // Buscamos la columna que nos pasan por el body
      const column = await category.findOne({ _id: categoryObjectId, user: userObjectId })
      if (column === null) {
        return { error: 'La columna no existe' }
      }

      // Borramos los links asociados a la columna
      await link.deleteMany({ categoryId: categoryObjectId, user: userObjectId })
      // Borramos la columna
      await category.deleteOne({ _id: categoryObjectId, user: userObjectId })
      // find by user y escritorio y pasar a ordenar
      const columnsLeft = await category.find({ parentId: column?.parentId, user: userObjectId }).sort({ order: 1 })
      const columsLeftIds = columnsLeft.map((col, index) => ({
        id: col._id.toString(),
        order: index,
        name: col.name
      }))
      await this.setColumnsOrder({ user, elements: columsLeftIds })

      return column
    } catch (error) {
      return ({ error: (error as Error).message })
    }
  }

  static async generateUniqueSlug ({ user, name }: ValidatedCategoryData): Promise<string> {
    if (name == null || name.trim() === '') {
      throw new Error('Category name is required to generate a slug')
    }
    let slug = this.slugify(name)
    const baseSlug = slug
    let counter = 0

    // Busca si el slug ya existe
    let exists = await category.findOne({ user, slug })

    // Mientras exista, genera un nuevo slug incrementando el contador
    while (exists !== null) {
      counter++
      slug = `${String(baseSlug)}_${String(counter)}`
      exists = await category.findOne({ user, slug })
    }

    return slug // Retorna el slug único generado
  }

  static slugify (text: string): string {
    return text.toString().toLowerCase()
      .trim() // Elimina espacios en blanco al inicio y al final
      .replace(/\s+/g, '-') // Reemplaza espacios por guiones
      .replace(/[^\w-]+/g, '') // Elimina caracteres no alfanuméricos (excepto guiones)
      .replace(/--+/g, '-') // Reemplaza múltiples guiones por uno solo
      .replace(/^-+/, '') // Elimina guiones al inicio
      .replace(/-+$/, '') // Elimina guiones al final
  }

  static async setColumnsOrder ({ user, elements }: ValidatedCategoryData): Promise<CategoryErrorResponse | { message: string }> {
    try {
      if (elements !== undefined) {
        // Actualizamos el campo "orden" de cada elemento en la base de datos
        const updates = elements.map(async (element) => {
          const order = element.order
          await category.findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(element.id), user: new mongoose.Types.ObjectId(user) },
            { order },
            { new: true }
          )
        })
        await Promise.all(updates)
      }
      return { message: 'success' }
    } catch (error) {
      return { error: (error as Error).message }
    }
  }

  static async deleteUserData ({ user }: { user: string }): Promise<{ status: string } | { error: string }> {
    const userObjectId = new mongoose.Types.ObjectId(user)
    try {
      // Eliminar todas las categorías del usuario
      await category.deleteMany({ user: userObjectId })
      // Eliminar todos los links del usuario
      await link.deleteMany({ user: userObjectId })

      return { status: 'Datos del usuario eliminados correctamente' }
    } catch (error) {
      console.error('Error al eliminar datos del usuario:', error)
      return { error: 'Error al eliminar los datos del usuario' }
    }
  }
}
