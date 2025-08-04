import mongoose from 'mongoose'
import type {
  CategoryCleanData,
  CategoryErrorResponse,
  MoveCategoryResponse
} from '../types/categoryModel.types'
import category from './schemas/categorySchema'
import link from './schemas/linkSchema'

/* eslint-disable @typescript-eslint/no-extraneous-class */
export class categoryModel {
  static async getAllCategories ({ user }: { user: string }): Promise<mongoose.Document[]> {
    const data = await category.find({ user }).sort({ order: 1 })
    return data
  }

  static async getTopLevelCategories ({ user }: { user: string }): Promise<mongoose.Document[]> {
    const data = await category.find({ user, level: 0 }).sort({ order: 1 })
    return data
  }

  static async getCategoryByParent ({ user, parentId }: { user: string, parentId: string }): Promise<mongoose.Document[] | CategoryErrorResponse> {
    const data = await category.find({ user, parentId }).sort({ order: 1 })
    if (data.length > 0) {
      return data
    } else {
      return { error: 'La category no existe' }
    }
  }

  static async getCategoryCount ({ user }: { user: string }): Promise<number | CategoryErrorResponse> {
    const data = await category.find({ user }).countDocuments()
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
    const slug = await this.generateUniqueSlug({ user, name: cleanData.name })
    const data = await category.create({ user, ...cleanData, slug })
    return [data]
  }

  static async updateCategory ({ user, id, cleanData, elements }: { user: string, id: string, cleanData: CategoryCleanData, elements?: string[] }): Promise<mongoose.Document | CategoryErrorResponse> {
    console.log(id, cleanData)
    // if name - if escritorio -> if order
    // Si el campo elementos está presente es una ordenación
    if (elements !== undefined) {
      const res = await this.setColumnsOrder({ user, elementos: elements, parentId: cleanData.parentId })
      // Es una ordenación terminamos aqui
      return res
    }
    // Si se ha movido a otro escritorio el campo escritorio está presente
    // tomamos el campo orden midiendo la longitud del array de columnas del escritorio destino
    if (cleanData.parentId !== undefined) {
      const destinationCategories = await category.find({ parentId: cleanData.parentId, user })
      cleanData.order = destinationCategories.length
    }
    // Si se ha cambiado el nombre de la columna actualizamos el slug
    if (cleanData.name !== undefined) {
      const slug = await this.generateUniqueSlug({ user, name: cleanData.name })
      cleanData.slug = slug
    }
    const session = await mongoose.startSession()
    try {
      session.startTransaction()
      // Actualizamos la columna
      const data = await category.findOneAndUpdate({ _id: id, user }, { $set: { ...cleanData } }, { new: true }).session(session)
      // Actualizamos los Links
      const filtro = { idpanel: id, user } // Filtrar documentos
      // Si se ha cambiado el nombre de la columna actualizamos el nombre del panel
      // Si se ha cambiado el escritorio actualizamos el escritorio de los links
      // No se pueden cambiar los dos a la vez
      const actualizacion = (cleanData.name != null && cleanData.name.trim() !== '')
        ? { $set: { panel: cleanData.name } }
        : { $set: { parentId: cleanData.parentId } } // Actualizar

      await link.updateMany(filtro, actualizacion).session(session) // esto puede fallar si no hay links?
      await session.commitTransaction()
      await session.endSession()
      if (data !== null) {
        return data
      } else {
        return { error: 'La columna no existe' }
      }
    } catch (error) {
      await session.abortTransaction()
      await session.endSession()
      return ({ error: (error as Error).message })
    }
  }

  static async deleteCategory ({ user, id }: { user: string, id: string }): Promise<mongoose.Document | CategoryErrorResponse> {
    const session = await mongoose.startSession()

    try {
      session.startTransaction()
      // Buscamos la columna que nos pasan por el body
      const column = await category.findOne({ _id: id, user }).session(session)
      // Borramos los links asociados a la columna
      await link.deleteMany({ idpanel: id, user }).session(session)
      // Borramos la columna
      await category.deleteOne({ _id: id, user }).session(session)
      await session.commitTransaction()
      await session.endSession()

      // find by user y escritorio y pasar a ordenar
      const columnsLeft = await category.find({ parentId: column?.parentId, user }).sort({ order: 1 })
      const columsLeftIds = columnsLeft.map(col => (
        col._id.toString()
      ))
      await this.setColumnsOrder({ user, elementos: columsLeftIds, parentId: column?.parentId })
      if (column !== null) {
        return column
      } else {
        return { error: 'La columna no existe' }
      }
    } catch (error) {
      await session.abortTransaction()
      await session.endSession()
      return ({ error: (error as Error).message })
    }
  }

  static async moveCategory ({ user, id, deskDestino, order }: { user: string, id: string, deskDestino: string, order?: number }): Promise<MoveCategoryResponse> {
    const data = await category.find({ parentId: deskDestino, user })

    await category.findOneAndUpdate(
      { _id: id }, // El filtro para buscar el documento
      { $set: { parentId: deskDestino, order } }, // Las propiedades a actualizar
      { new: true } // Opciones adicionales (en este caso, devuelve el documento actualizado)
    )
    // Actualizamos los Links
    const filtroL = { user, idpanel: id } // Filtrar documentos
    const actualizacionL = { $set: { escritorio: deskDestino } } // Actualizar

    await link.updateMany(filtroL, actualizacionL)

    return {
      response: {
        length: data.length,
        message: 'Movido correctamente'
      }
    }
  }

  static async generateUniqueSlug ({ user, name }: { user: string, name: string }): Promise<string> {
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

  static async setColumnsOrder ({ user, elementos, parentId }: { user: string, elementos: string[], parentId?: string }): Promise<CategoryErrorResponse> {
    try {
      if (parentId === null || parentId === undefined || parentId === '') {
        return { error: 'Falta el parámetro "escritorio"' }
      }

      // Creamos un mapa para almacenar el orden actual de los elementos
      const ordenActual = new Map()
      let orden = 0
      elementos.forEach((elemento) => {
        ordenActual.set(elemento, orden)
        orden++
      })

      // Actualizamos el campo "orden" de cada elemento en la base de datos
      const updates = elementos.map(async (elemento) => {
        const orden = ordenActual.get(elemento)
        console.log(elemento)
        try {
          const updatedElement = await category.findOneAndUpdate(
            { _id: elemento, user, parentId },
            { order: orden },
            { new: true }
          )

          if (updatedElement === null) {
            console.warn(`No se encontró el elemento con _id=${elemento} y escritorio=${parentId}`)
          }
        } catch (error) {
          console.error(`Error al actualizar el elemento con _id=${elemento} y escritorio=${parentId}: ${(error as Error).message}`)
        }
      })
      await Promise.all(updates)

      // Enviamos la respuesta
      return { error: '' } // vacío indica éxito, puedes ajustar el mensaje si lo prefieres
    } catch (error) {
      console.error(error)
      return { error: 'Error al actualizar los elementos' }
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
      parentId: string | null
    }>
  }): Promise<{ success: boolean, updatedCount: number, errors: string[] }> {
    const session = await mongoose.startSession()
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
            user
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
            { _id: itemId, user },
            { $set: updateData },
            { new: true, session }
          )

          if (updatedCategory !== null) {
            updatedCount++

            // Si se cambió el parentId, también actualizar los links asociados
            if (parentId !== undefined && existingCategory.parentId !== parentId) {
              await link.updateMany(
                { idpanel: itemId, user },
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
    categories
  }: {
    user: string
    categories: Array<{
      itemId: string
      newOrder: number
      newLevel: number
      parentId: string | null
      parentSlug: string | null
    }>
  }): Promise<{ success: boolean, updatedCount: number, errors: string[] }> {
    const errors: string[] = []
    let updatedCount = 0
    // console.log('🚀 ~ categoryModel ~ updateReorderingCategories ~ user:', parentSlug)

    try {
      // Procesar cada categoría
      for (const categoryUpdate of categories) {
        const { itemId, newOrder, newLevel, parentId, parentSlug } = categoryUpdate
        console.log('🚀 ~ categoryModel ~ updateReorderingCategories ~ itemId:', parentSlug)
        const findDocument = await category.findById((new mongoose.Types.ObjectId(itemId)))
        console.log('🚀 ~ categoryModel ~ updateReorderingCategories ~ findDocument:', findDocument)

        // Actualizar solo order y level (sin parentId para reordering)
        const result = await category.findOneAndUpdate(
          { _id: itemId, user },
          { $set: { order: newOrder, level: newLevel, parentId, parentSlug } },
          { new: true }
        )
        console.log('🚀 ~ categoryModel ~ updateReorderingCategories ~ result:', result)

        if (result !== null) {
          updatedCount++
        } else {
          errors.push(`No se encontró categoría ${itemId}`)
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

  // ===== FUNCIÓN SIMPLE DE DEBUG =====
  static async testSimpleQuery (id: string): Promise<void> {
    console.log(`=== TEST SIMPLE CON ID: ${id} ===`)

    try {
      // Test 1: findById directo
      const test1 = await category.findById(id)
      console.log('Test 1 - findById():', test1 !== null ? '✅ ENCONTRADO' : '❌ NO ENCONTRADO')

      // Test 2: findOne con _id
      const test2 = await category.findOne({ _id: id })
      console.log('Test 2 - findOne({_id}):', test2 !== null ? '✅ ENCONTRADO' : '❌ NO ENCONTRADO')

      // Test 3: Verificar si es ObjectId válido
      console.log('Test 3 - Es ObjectId válido?', mongoose.Types.ObjectId.isValid(id))

      // Test 4: Count documents con este ID
      const count = await category.countDocuments({ _id: id })
      console.log('Test 4 - Count con este ID:', count)

      if (test1 !== null) {
        console.log('✅ Documento encontrado - Usuario:', test1.user)
        console.log('✅ Documento encontrado - Nombre:', test1.name)
      }
    } catch (error) {
      console.log('❌ Error en test:', (error as Error).message)
    }
  }

  static async deleteUserData ({ user }: { user: string }): Promise<{ status: string } | { error: string }> {
    try {
      // Eliminar todas las categorías del usuario
      await category.deleteMany({ user })
      // Eliminar todos los links del usuario
      await link.deleteMany({ user })

      return { status: 'Datos del usuario eliminados correctamente' }
    } catch (error) {
      console.error('Error al eliminar datos del usuario:', error)
      return { error: 'Error al eliminar los datos del usuario' }
    }
  }
}
