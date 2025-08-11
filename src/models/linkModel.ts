import type { DeleteResult } from 'mongodb'
import mongoose from 'mongoose'
import link from './schemas/linkSchema'

export interface LinkFields {
  name?: string
  description?: string
  url?: string
  imgUrl?: string
  categoryName?: string
  categoryId?: string
  notes?: string
  images?: string[]
  bookmark?: boolean
  bookmarkOrder?: number
  readList?: boolean
  order?: number
  linkId?: string | string[]
}
export interface ValidatedLinkData extends LinkFields {
  user?: string
  id?: string
  oldCategoryId?: string
  destinyIds?: Array<{ id: string, order: number, name?: string, categoryId: string }>
  previousIds?: Array<{ id: string, order: number, name?: string, categoryId: string }>
  fields?: LinkFields
  destinationCategoryId?: string
  previousCategoryId?: string
  links?: string[]
}
/* eslint-disable @typescript-eslint/no-extraneous-class */
export class linkModel {
  // Quitar try catch lanzar errores con throw y gestionar errores en el controlador
  static async getAllLinks ({ user }: ValidatedLinkData): Promise<mongoose.Document[]> {
    const userObjectId = new mongoose.Types.ObjectId(user)
    const data = await link.find({ user: userObjectId }).sort({ order: 1 })
    return data
  }

  static async getLinkById ({ user, id }: ValidatedLinkData): Promise<mongoose.Document | { error: string }> {
    const userObjectId = new mongoose.Types.ObjectId(user)
    const data = await link.findOne({ user: userObjectId, _id: id })
    if (data != null) {
      return data
    } else {
      return { error: 'El link no existe' }
    }
  }

  static async getLinksByTopCategoryId ({ user, id }: ValidatedLinkData): Promise<mongoose.Document[] | { error: string }> {
    const userObjectId = new mongoose.Types.ObjectId(user)
    const categoryObjectId = new mongoose.Types.ObjectId(id)
    const data = await link.find({ user: userObjectId, categoryId: categoryObjectId })
    if (data.length > 0) {
      return data
    } else {
      return { error: 'El link no existe' }
    }
  }

  static async getLinksCount ({ user, categoryId }: ValidatedLinkData): Promise<number | { error: string }> {
    const userObjectId = new mongoose.Types.ObjectId(user)
    let data
    if (typeof categoryId === 'string' && categoryId.trim() !== '') {
      const categoryObjectId = new mongoose.Types.ObjectId(categoryId)
      data = await link.countDocuments({ user: userObjectId, categoryId: categoryObjectId })
    } else {
      data = await link.countDocuments({ user: userObjectId })
    }
    if (data === undefined) {
      return { error: 'Categoría no encontrada' }
    }
    return data
  }

  static async createLink ({ cleanData }: { cleanData: ValidatedLinkData }): Promise<mongoose.Document> {
    console.log('🚀 ~ linkModel ~ createLink ~ cleanData:', cleanData)

    // gestionar errores aqui --- ver node midu
    const data = await link.create({ ...cleanData })
    console.log('🚀 ~ linkModel ~ createLink ~ data:', data)
    return data
  }

  static async updateLink ({ validatedData }: { validatedData: ValidatedLinkData }): Promise<mongoose.Document | { error: string }> {
    const { user, id, destinyIds, fields, previousIds } = validatedData
    const userObjectId = new mongoose.Types.ObjectId(user)

    const updatedLink = await link.findOneAndUpdate({ _id: id, user: userObjectId }, { $set: fields }, { new: true })
    // Cuando se arrastra el link a otra categoría, se ordenan los links de la categoría antigua y de la nueva
    if (previousIds !== undefined) {
      await linkModel.sortLinks({ previousIds })
    }
    if (destinyIds !== undefined) {
      await linkModel.sortLinks({ destinyIds })
    }
    if (updatedLink == null) {
      return { error: 'El link no existe' }
    }
    return updatedLink
  }

  static async bulkMoveLinks ({ user, destinationCategoryId, previousCategoryId, links }: ValidatedLinkData): Promise<import('mongodb').BulkWriteResult | { error: string }> {
    const userObjectId = new mongoose.Types.ObjectId(user)
    const destinationObjectId = new mongoose.Types.ObjectId(destinationCategoryId)

    // Contar los links existentes en la categoría de destino
    const existingLinksCount = await link.countDocuments({
      user: userObjectId,
      categoryId: destinationObjectId
    })

    // Mover los links y asignar orden secuencial a partir del conteo actual
    if (links == null || !Array.isArray(links) || links.length === 0) {
      return { error: 'No se proporcionaron enlaces para mover' }
    }

    const updateOperations = links.map((linkId, index) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(linkId), user: userObjectId },
        update: {
          $set: {
            categoryId: destinationObjectId,
            order: existingLinksCount + index
          }
        }
      }
    }))

    const result = await link.bulkWrite(updateOperations)

    if (result.modifiedCount === 0) {
      return { error: 'No se movieron enlaces' }
    }

    // Reordenar los links que quedan en la categoría anterior
    if (typeof previousCategoryId === 'string' && previousCategoryId.trim() !== '') {
      const previousCategoryObjectId = new mongoose.Types.ObjectId(previousCategoryId)
      const remainingLinks = await link.find({
        user: userObjectId,
        categoryId: previousCategoryObjectId
      }).sort({ order: 1 }).select('_id')

      if (remainingLinks.length > 0) {
        const reorderOperations = remainingLinks.map((linkDoc, index) => ({
          updateOne: {
            filter: { _id: linkDoc._id, user: userObjectId },
            update: { $set: { order: index } }
          }
        }))

        await link.bulkWrite(reorderOperations)
      }
    }

    return result
  }

  static async deleteLink ({ user, linkId }: ValidatedLinkData): Promise<mongoose.Document | DeleteResult | { error: string }> {
    const userObjectId = new mongoose.Types.ObjectId(user)

    if (Array.isArray(linkId)) {
      // Obtener las categorías de los links antes de eliminarlos
      const linksToDelete = await link.find({ _id: { $in: linkId }, user: userObjectId }).select('categoryId')

      // Extraer categoryIds de forma más legible
      const categoryIds: string[] = []
      for (const linkDoc of linksToDelete) {
        if (linkDoc.categoryId != null) {
          const categoryIdString = linkDoc.categoryId.toString()
          if (!categoryIds.includes(categoryIdString)) {
            categoryIds.push(categoryIdString)
          }
        }
      }

      const data = await link.deleteMany({ _id: { $in: linkId }, user: userObjectId })

      if (data.deletedCount > 0) {
        // Reordenar los links que quedan en cada categoría afectada
        for (const categoryId of categoryIds) {
          const categoryObjectId = new mongoose.Types.ObjectId(categoryId)
          const remainingLinks = await link.find({
            user: userObjectId,
            categoryId: categoryObjectId
          }).sort({ order: 1 }).select('_id')

          if (remainingLinks.length > 0) {
            const reorderOperations = remainingLinks.map((linkDoc, index) => ({
              updateOne: {
                filter: { _id: linkDoc._id, user: userObjectId },
                update: { $set: { order: index } }
              }
            }))

            await link.bulkWrite(reorderOperations)
          }
        }
      }

      return data
    } else {
      const data = await link.findOneAndDelete({ _id: linkId, user: userObjectId })

      if (data != null) {
        // Reordenar los links que quedan en la categoría
        if (data.categoryId != null && data.categoryId.toString().trim() !== '') {
          const categoryObjectId = new mongoose.Types.ObjectId(data.categoryId.toString())
          const remainingLinks = await link.find({
            user: userObjectId,
            categoryId: categoryObjectId
          }).sort({ order: 1 }).select('_id')

          if (remainingLinks.length > 0) {
            const reorderOperations = remainingLinks.map((linkDoc, index) => ({
              updateOne: {
                filter: { _id: linkDoc._id, user: userObjectId },
                update: { $set: { order: index } }
              }
            }))

            await link.bulkWrite(reorderOperations)
          }
        }

        return data
      } else {
        return { error: 'El link no existe' }
      }
    }
  }

  static async findDuplicateLinks ({ user }: ValidatedLinkData): Promise<mongoose.Document[] | { error: string }> {
    try {
      const userObjectId = new mongoose.Types.ObjectId(user)
      const duplicados = await link.aggregate([
        { $match: { user: userObjectId } }, // Filtrar por el usuario específico
        { $group: { _id: '$url', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }
      ])
      const search = await Promise.all(
        duplicados.map(async (item) => {
          try {
            const objeto = await link.find({ url: item._id, user: userObjectId })
            return objeto
          } catch (error) {
            console.error('Error en la búsqueda:', error)
          }
        })
      )
      const flattenedData = search.flatMap(group => group).filter(Boolean) as mongoose.Document[]
      return flattenedData
    } catch (error) {
      console.error('Error en la consulta:', error)
      return { error: String(error) }
    }
  }

  static async setImagesInDb ({ url, user, id }: ValidatedLinkData): Promise<mongoose.Document | { error: string }> {
    const userObjectId = new mongoose.Types.ObjectId(user)
    const linkObjectId = new mongoose.Types.ObjectId(id)
    if (typeof url === 'string' && url.trim() !== '') {
      const data = await link.findOneAndUpdate(
        { _id: linkObjectId, user: userObjectId },
        { $push: { images: url } },
        { new: true }
      )
      if (data != null) {
        return data
      } else {
        return { error: 'Link no encontrado' }
      }
    } else {
      return { error: 'No hay url' }
    }
  }

  static async deleteImageOnDb ({ url, user, id }: ValidatedLinkData): Promise<mongoose.Document | { error: string }> {
    try {
      const userObjectId = new mongoose.Types.ObjectId(user)
      const linkObjectId = new mongoose.Types.ObjectId(id)
      const updatedArticle = await link.findOneAndUpdate(
        { _id: linkObjectId, user: userObjectId },
        { $pull: { images: { $in: [url] } } },
        { new: true }
      )

      if (updatedArticle != null) {
        console.log('Artículo actualizado:', updatedArticle)

        return updatedArticle
      } else {
        console.log('No se encontró ningún artículo que cumpla los criterios de búsqueda.')
        return { error: 'No encontrado' }
      }
    } catch (error) {
      console.error('Error al actualizar el artículo:', error)
      return { error: 'Error al borrar' }
    }
  }

  static async setLinkImgInDb ({ url, user, id }: ValidatedLinkData): Promise<{ message: string } | { error: any }> {
    if (typeof url !== 'string' || url.trim() === '') {
      return { error: 'URL inválida' }
    }
    const urlObj = new URL(url)
    const dominio = 'firebasestorage.googleapis.com'
    const dominio2 = 't1.gstatic.com'

    const imagePath = (urlObj.hostname === dominio || urlObj.hostname === dominio2) ? url : urlObj.pathname

    try {
      const userObjectId = new mongoose.Types.ObjectId(user)
      const linkObjectId = new mongoose.Types.ObjectId(id)
      await link.findOneAndUpdate({ _id: linkObjectId, user: userObjectId }, { $set: { imgUrl: imagePath } })
      return { message: 'imagen de link cambiada' }
    } catch (error) {
      return ({ error })
    }
  }

  static async searchLinks ({ user, query }: { user: string, query: string }): Promise<mongoose.Document[]> {
    const userObjectId = new mongoose.Types.ObjectId(user)
    const data = await link.find({
      $or: [
        { name: query, user: userObjectId },
        { url: query, user: userObjectId },
        { notes: query, user: userObjectId }
      ]
    })
    return data
  }

  static async setBookMarksOrder ({ user, links }: { user: string, links: Array<[string, number]> }): Promise<Array<{ id: string, order: number }>> {
    try {
      const userObjectId = new mongoose.Types.ObjectId(user)
      const updateOperations = links.map(([linkId, order]) => ({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(linkId), user: userObjectId },
          update: { $set: { bookmarkOrder: order } }
        }
      }))

      await link.bulkWrite(updateOperations)

      // Devuelve directamente el array recibido, ya que refleja el nuevo orden
      return links.map(([id, order]) => ({ id, order }))
    } catch (error) {
      console.error('Error en setBookMarksOrder:', error)
      throw error
    }
  }

  // Elementos son los ids de los elementos hacia o desde el panel al que se mueve el link. Si no se especifica, se ordenan todos los links del panel idPanelOrigen, es un drag and drop en la misma categoría
  static async sortLinks ({ user, destinyIds, previousIds }: ValidatedLinkData): Promise<{ message: string } | { error: any }> {
    if (previousIds === undefined && destinyIds === undefined) {
      return { error: 'No hay elementos para ordenar' }
    }
    try {
      if (destinyIds !== undefined) {
        // Actualizamos el campo "orden" de cada elemento en la base de datos
        const updates = destinyIds.map(async (element) => {
          const order = element.order
          await link.findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(element.id), categoryId: new mongoose.Types.ObjectId(element.categoryId), user },
            { order },
            { new: true }
          )
        })
        await Promise.all(updates)
      }
      if (previousIds !== undefined) {
        // Actualizamos el campo "orden" de cada elemento en la base de datos
        const updates = previousIds.map(async (element) => {
          const order = element.order
          await link.findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(element.id), categoryId: new mongoose.Types.ObjectId(element.categoryId), user },
            { order },
            { new: true }
          )
        })
        await Promise.all(updates)
      }
      return { message: 'success' }
    } catch (error) {
      return { error }
    }
  }
}
