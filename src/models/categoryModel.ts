import mongoose from 'mongoose'
import type {
  CategoryCleanData,
  CategoryErrorResponse,
  MoveCategoryResponse
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
}
export interface ValidatedCategoryData extends CategoryFields {
  user: string
  updates?: CategoryFields[]
  fields?: CategoryFields
  elements?: Array<{ id: string, order: number, name?: string, parentId?: string }>
  oldParentId?: string
}
export interface NewValidatedCategoryData extends CategoryFields {
  // user: string
  // id: string
  // oldParentId?: string
  // fields: CategoryFields
  updates: ValidatedCategoryData[]
}

/* eslint-disable @typescript-eslint/no-extraneous-class */
export class categoryModel {
  static async getAllCategories ({ user }: { user: string }): Promise<mongoose.Document[] | CategoryErrorResponse> {
    const objectIdUser = new mongoose.Types.ObjectId(user)
    const data = await category.find({ user: objectIdUser }).sort({ order: 1 })

    if (data.length > 0) {
      return data
    } else {
      return { error: 'No se encontraron categorías' }
    }
  }

  static async getTopLevelCategories ({ user }: { user: string }): Promise<mongoose.Document[]> {
    const objectIdUser = new mongoose.Types.ObjectId(user)
    const data = await category.find({ user: objectIdUser, level: 0 }).sort({ order: 1 })
    return data
  }

  static async getCategoriesByParentSlug ({ user, parentSlug }: { user: string, parentSlug: string }): Promise<mongoose.Document[] | CategoryErrorResponse> {
    const objectIdUser = new mongoose.Types.ObjectId(user)
    const data = await category.find({ user: objectIdUser, parentSlug }).sort({ order: 1 })
    if (data.length > 0) {
      return data
    } else {
      return { error: 'La category no existe' }
    }
  }

  static async getCategoryCount ({ user }: { user: string }): Promise<number | CategoryErrorResponse> {
    const objectIdUser = new mongoose.Types.ObjectId(user)
    const data = await category.find({ user: objectIdUser }).countDocuments()
    if (data > 0) {
      return data
    } else {
      return { error: 'No se encuentran columnas para este usuario' }
    }
  }

  static async createCategory (
    { user, cleanData }: { user: string, cleanData: CategoryCleanData }
  ): Promise<mongoose.Document[]> {
    if (cleanData.name == null || cleanData.name.trim() === '') {
      throw new Error('Category name is required to generate a slug')
    }
    const objectIdUser = new mongoose.Types.ObjectId(user)
    const slug = await this.generateUniqueSlug({ user: objectIdUser, name: cleanData.name })
    const data = await category.create({ user: objectIdUser, ...cleanData, slug })
    return [data]
  }

  static async newUpdateCategory ({ updates }: NewValidatedCategoryData): Promise<Array<mongoose.Document | { id: string | undefined, error: string }> | CategoryErrorResponse> {
    try {
      const updatedData = []
      for (const update of updates) {
        const { user, id, fields } = update
        const userObjectId = new mongoose.Types.ObjectId(user)
        const objectId = new mongoose.Types.ObjectId(id)
        if (fields?.name !== undefined) {
          const slug = await this.generateUniqueSlug({ user: userObjectId, name: fields.name })
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

  static async updateCategory ({ user, id, fields, elements, oldParentId }: ValidatedCategoryData): Promise<mongoose.Document | CategoryErrorResponse> {
    const userObjectId = new mongoose.Types.ObjectId(user)
    const parentIdObjectId = new mongoose.Types.ObjectId(fields?.parentId)
    const oldParentIdObjectId = new mongoose.Types.ObjectId(oldParentId)
    // if name - if escritorio -> if order
    // Si el campo elementos está presente es una ordenación
    if (elements !== undefined && fields !== undefined && fields.parentId !== undefined) {
      console.log('ejecutamos ordenación')

      await this.setColumnsOrder({ user, elements, parentId: fields.parentId })
      // Es una ordenación terminamos aqui
      return { error: '' }
    }
    // Si se ha movido a otro escritorio el campo escritorio está presente
    // tomamos el campo orden midiendo la longitud del array de columnas del escritorio destino
    if (fields?.parentId !== undefined) {
      const destinationCategories = await category.find({ parentId: parentIdObjectId, user: userObjectId })
      fields.order = destinationCategories.length
    }
    // Si se ha cambiado el nombre de la columna actualizamos el slug
    if (fields?.name !== undefined) {
      const slug = await this.generateUniqueSlug({ user: userObjectId, name: fields.name })
      fields.slug = slug
    }
    // Ordenar categoria padre si se mueve a otro padre, PERO ESTO DEBE IR DESPUES DE LA ACTUALIZACION
    if (fields?.parentId !== undefined && oldParentId !== undefined) {
      const oldParent = await category.findById(oldParentId)
      const oldCategories = await category.find({ parentId: oldParentIdObjectId, user: userObjectId })
      const oldElements = oldCategories.map((col, index) => ({
        id: col._id.toString(),
        order: index,
        name: col.name,
        parentId: fields.parentId
      }))
      if (oldParent !== null && oldElements !== undefined) {
        await this.setColumnsOrder({ user, elements: oldElements, parentId: oldParent._id.toString() })
      }
    }

    try {
      // Actualizamos la columna sin transacciones para test environment
      const data = await category.findOneAndUpdate({ _id: id, user: userObjectId }, { $set: { ...fields } }, { new: true })

      if (data !== null) {
        return data
      } else {
        return { error: 'La columna no existe' }
      }
    } catch (error) {
      return ({ error: (error as Error).message })
    }
  }

  static async deleteCategory ({ user, id }: { user: string, id: string }): Promise<mongoose.Document | CategoryErrorResponse> {
    const userObjectId = new mongoose.Types.ObjectId(user)
    try {
      // Buscamos la columna que nos pasan por el body
      const column = await category.findOne({ _id: id, user: userObjectId })
      if (column === null) {
        return { error: 'La columna no existe' }
      }

      // Borramos los links asociados a la columna
      await link.deleteMany({ idpanel: id, user: userObjectId })
      // Borramos la columna
      await category.deleteOne({ _id: id, user: userObjectId })

      // find by user y escritorio y pasar a ordenar
      const columnsLeft = await category.find({ parentId: column?.parentId, user: userObjectId }).sort({ order: 1 })
      const columsLeftIds = columnsLeft.map((col, index) => ({
        id: col._id.toString(),
        order: index,
        name: col.name,
        parentId: undefined
      }))
      await this.setColumnsOrder({ user, elements: columsLeftIds, parentId: column?.parentId?.toString() })

      return column
    } catch (error) {
      return ({ error: (error as Error).message })
    }
  }

  static async moveCategory ({ user, id, deskDestino, order }: { user: string, id: string, deskDestino: string, order?: number }): Promise<MoveCategoryResponse> {
    const userObjectId = new mongoose.Types.ObjectId(user)
    const data = await category.find({ parentId: deskDestino, user: userObjectId })

    await category.findOneAndUpdate(
      { _id: id }, // El filtro para buscar el documento
      { $set: { parentId: deskDestino, order } }, // Las propiedades a actualizar
      { new: true } // Opciones adicionales (en este caso, devuelve el documento actualizado)
    )
    // Actualizamos los Links
    const filtroL = { user: userObjectId, idpanel: id } // Filtrar documentos
    const actualizacionL = { $set: { escritorio: deskDestino } } // Actualizar

    await link.updateMany(filtroL, actualizacionL)

    return {
      response: {
        length: data.length,
        message: 'Movido correctamente'
      }
    }
  }

  static async generateUniqueSlug ({ user, name }: { user: mongoose.Types.ObjectId, name: string }): Promise<string> {
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

  static async setColumnsOrder ({ user, elements, parentId }: ValidatedCategoryData): Promise<CategoryErrorResponse | { message: string }> {
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

  static async updateNestingCategories ({
    user,
    categories
  }: {
    user: string
    categories: Array<{
      itemId: string
      newOrder: number
      newLevel: number
      parentId: mongoose.Types.ObjectId | null
    }>
  }): Promise<{ success: boolean, updatedCount: number, errors: string[] }> {
    const session = await mongoose.startSession()
    const userObjectId = new mongoose.Types.ObjectId(user)
    const errors: string[] = []
    let updatedCount = 0

    try {
      session.startTransaction()

      // Procesar cada categoría en el array
      for (const categoryUpdate of categories) {
        try {
          const { itemId, newOrder, newLevel, parentId } = categoryUpdate

          // Verificar que la categoría existe y pertenece al usuario
          const existingCategory = await category.findOne({
            _id: itemId,
            user: userObjectId
          }).session(session)

          if (existingCategory === null) {
            errors.push(`Categoría con ID ${itemId} no encontrada`)
            continue
          }

          // Preparar los datos de actualización
          const updateData: any = {
            order: newOrder,
            level: newLevel
          }

          // Solo actualizar parentId si se proporciona (puede ser null para categorías raíz)
          if (parentId !== undefined) {
            updateData.parentId = parentId
          }

          // Actualizar la categoría
          const updatedCategory = await category.findOneAndUpdate(
            { _id: itemId, user: userObjectId },
            { $set: updateData },
            { new: true, session }
          )

          if (updatedCategory !== null) {
            updatedCount++

            // Si se cambió el parentId, también actualizar los links asociados
            if (parentId !== undefined && existingCategory.parentId !== parentId) {
              await link.updateMany(
                { idpanel: itemId, user: userObjectId },
                { $set: { parentId } },
                { session }
              )
            }
          } else {
            errors.push(`No se pudo actualizar la categoría ${itemId}`)
          }
        } catch (error) {
          errors.push(`Error actualizando categoría ${categoryUpdate.itemId}: ${(error as Error).message}`)
        }
      }

      // Confirmar la transacción solo si no hay errores críticos
      if (errors.length === 0 || updatedCount > 0) {
        await session.commitTransaction()
      } else {
        await session.abortTransaction()
      }

      await session.endSession()

      return {
        success: errors.length === 0,
        updatedCount,
        errors
      }
    } catch (error) {
      await session.abortTransaction()
      await session.endSession()

      return {
        success: false,
        updatedCount: 0,
        errors: [`Error general en la transacción: ${(error as Error).message}`]
      }
    }
  }

  static async updateReorderingCategories ({
    user,
    updates
  }: ValidatedCategoryData): Promise<{ success: boolean, updatedCount: number, errors: string[] }> {
    const userObjectId = new mongoose.Types.ObjectId(user)
    const errors: string[] = []
    let updatedCount = 0

    if (updates === undefined || updates.length === 0) {
      errors.push('No se proporcionaron actualizaciones')
      return {
        success: false,
        updatedCount: 0,
        errors
      }
    }

    try {
      for (const categoryUpdate of updates) {
        const { id, order, level, parentId, parentSlug } = categoryUpdate

        // Validación de campos obligatorios
        if (id === null || id === undefined || id === '') {
          errors.push('El campo id es obligatorio')
          continue
        }
        if (order === undefined) {
          errors.push(`El campo order es obligatorio para la categoría ${id}`)
          continue
        }
        if (level !== undefined && level !== 0) {
          if (parentId === undefined || parentSlug === undefined) {
            errors.push(`Si se proporciona level distinto de 0, también deben venir parentId y parentSlug para la categoría ${id}`)
            continue
          }
        }

        const categoryObjectId = new mongoose.Types.ObjectId(id)
        const updateData: any = { order }

        if (level !== undefined) {
          updateData.level = level
          if (level === 0) {
            updateData.parentId = null
            updateData.parentSlug = null
          } else {
            updateData.parentId = (parentId !== null && parentId !== undefined && parentId !== '') ? new mongoose.Types.ObjectId(parentId) : null
            updateData.parentSlug = parentSlug
          }
        }

        const result = await category.updateOne(
          { _id: categoryObjectId, user: userObjectId },
          { $set: updateData }
        )

        if (result.matchedCount === 0) {
          errors.push(`No se encontró categoría ${id}`)
        } else if (result.modifiedCount > 0) {
          updatedCount++
        }
      }

      return {
        success: errors.length === 0,
        updatedCount,
        errors
      }
    } catch (error) {
      return {
        success: false,
        updatedCount: 0,
        errors: [`Error: ${(error as Error).message}`]
      }
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
