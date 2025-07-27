import mongoose from 'mongoose'
import link from './schemas/linkSchema'
import type { DeleteResult } from 'mongodb'

type LinkCleanData = Omit<{
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
}, 'user'>
/* eslint-disable @typescript-eslint/no-extraneous-class */
export class linkModel {
  // Quitar try catch lanzar errores con throw y gestionar errores en el controlador
  static async getAllLinks ({ user }: { user: string }): Promise<mongoose.Document[]> {
    const data = await link.find({ user }).sort({ order: 1 })
    return data
  }

  static async getLinkById ({ user, id }: { user: string, id: string }): Promise<mongoose.Document | { error: string }> {
    const data = await link.findOne({ user, _id: id })
    if (data != null) {
      return data
    } else {
      return { error: 'El link no existe' }
    }
  }

  static async getLinksByTopCategory ({ user, topCategory }: { user: string, topCategory: string }): Promise<mongoose.Document[] | { error: string }> {
    const data = await link.find({ user, topCategory })
    if (data.length > 0) {
      return data
    } else {
      return { error: 'El link no existe' }
    }
  }

  static async getLinksCount ({ user, category }: { user: string, category?: string }): Promise<number> {
    let data
    if (typeof category === 'string' && category.trim() !== '') {
      data = await link.countDocuments({ user, categoryId: category })
    } else {
      data = await link.countDocuments({ user })
    }
    return data
  }

  static async createLink ({ cleanData }: { cleanData: LinkCleanData }): Promise<mongoose.Document> {
    console.log(cleanData)
    // gestionar errores aqui --- ver node midu
    const data = await link.create({ ...cleanData })
    return data
  }

  static async updateLink ({ id, user, idpanelOrigen, cleanData, destinyIds }: { id: string, user: string, idpanelOrigen?: string, cleanData: LinkCleanData, destinyIds?: string[] }): Promise<mongoose.Document | { error: string }> {
    console.log('🚀 ~ file: linkModel.js:41 ~ linkModel ~ updateLink ~ cleanData:', cleanData)
    console.log('🚀 ~ file: linkModel.js:41 ~ linkModel ~ updateLink ~ destinyIds:', destinyIds)
    const data = await link.findOneAndUpdate({ _id: id, user }, { $set: { ...cleanData } }, { new: true })
    if (idpanelOrigen !== undefined) {
      await linkModel.sortLinks({ idpanelOrigen })
    }
    if (idpanelOrigen !== undefined && destinyIds !== undefined && typeof cleanData.categoryId === 'string') {
      await linkModel.sortLinks({ idpanelOrigen: cleanData.categoryId, elementos: destinyIds })
    }
    if (data == null) {
      return { error: 'El link no existe' }
    }
    return data // la data puede ser un error
  }

  static async bulkMoveLinks ({ user, source, destiny, panel, links, escritorio }: { user: string, source: string, destiny: string, panel: string, links: string[], escritorio?: string }): Promise<mongoose.UpdateWriteOpResult | { error: string }> {
    const data = await link.updateMany({ _id: { $in: links }, user }, { $set: { categoryId: destiny, categoryName: panel, escritorio } })
    if (data.modifiedCount === 0) {
      return { error: 'No se movieron enlaces' }
    }
    return data
  }

  static async deleteLink ({ user, linkId }: { user: string, linkId: string | string[] }): Promise<mongoose.Document | DeleteResult | { error: string }> {
    if (Array.isArray(linkId)) {
      const data = await link.deleteMany({ _id: { $in: linkId }, user })
      // if (data) {
      //   await linkModel.sortLinks({ idpanelOrigen: data[0].idpanel }) -> Ordenar links que quedan en el panel
      // }
      return data // la data puede ser un error
    } else {
      const data = await link.findOneAndDelete({ _id: linkId, user })
      if (data != null) {
        if (data.categoryId != null && data.categoryId.trim() !== '') {
          await linkModel.sortLinks({ idpanelOrigen: data.categoryId })
        }
        return data
      } else {
        return { error: 'El link no existe' }
      }
    }
  }

  static async findDuplicateLinks ({ user }: { user: string }): Promise<mongoose.Document[] | { error: string }> {
    try {
      const duplicados = await link.aggregate([
        { $match: { user } }, // Filtrar por el usuario específico
        { $group: { _id: '$url', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }
      ])
      const search = await Promise.all(
        duplicados.map(async (item) => {
          try {
            const objeto = await link.find({ url: item._id, user })
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

  static async setImagesInDb ({ url, user, linkId }: { url: string, user: string, linkId: string }): Promise<mongoose.Document | { error: string }> {
    if (typeof url === 'string' && url.trim() !== '') {
      const data = await link.findOneAndUpdate(
        { _id: linkId, user },
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

  static async deleteImageOnDb ({ url, user, linkId }: { url: string, user: string, linkId: string }): Promise<mongoose.Document | { error: string }> {
    try {
      const updatedArticle = await link.findOneAndUpdate(
        { _id: linkId, user },
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

  static async setLinkImgInDb ({ url, user, linkId }: { url: string, user: string, linkId: string }): Promise<{ message: string } | { error: any }> {
    const urlObj = new URL(url)
    const dominio = 'firebasestorage.googleapis.com'
    const dominio2 = 't1.gstatic.com'

    const imagePath = (urlObj.hostname === dominio || urlObj.hostname === dominio2) ? url : urlObj.pathname

    try {
      await link.findOneAndUpdate({ _id: linkId, user }, { $set: { imgURL: imagePath } })
      return { message: 'imagen de link cambiada' }
    } catch (error) {
      return ({ error })
    }
  }

  static async searchLinks ({ user, query }: { user: string, query: string }): Promise<mongoose.Document[]> {
    const data = await link.find({
      $or: [
        { name: query, user },
        { url: query, user },
        { notes: query, user }
      ]
    })
    return data
  }

  static async setBookMarksOrder ({ user, links }: { user: string, links: Array<[string, number]> }): Promise<Array<{ id: string, order: number }>> {
    try {
      const updateOperations = links.map(([linkId, order]) => ({
        updateOne: {
          filter: { _id: linkId, user },
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

  // Elementos son los ids de los elementos hacia o desde el panel al que se mueve el link
  static async sortLinks ({ idpanelOrigen, elementos }: { idpanelOrigen: string, elementos?: string[] }): Promise<{ message: string } | { error: any }> {
    let dataToSort
    if (elementos === undefined) {
      const links = await link.find({ categoryId: idpanelOrigen }).sort({ order: 1 }).select('_id')
      const stringIds = links.map(link => link._id.toString())
      dataToSort = stringIds
    } else {
      dataToSort = elementos
    }
    try {
      // Creamos un mapa para almacenar el orden actual de los elementos
      const ordenActual = new Map()
      let orden = 0
      dataToSort.forEach((elemento) => {
        ordenActual.set(elemento, orden)
        orden++
      })
      console.log(ordenActual)
      // Actualizamos el campo "orden" de cada elemento en la base de datos
      const updates = dataToSort.map(async (elemento) => {
        const orden = ordenActual.get(elemento)
        await link.findOneAndUpdate(
          { _id: elemento, categoryId: idpanelOrigen },
          { order: orden },
          { new: true }
        )
      })
      await Promise.all(updates)
      return { message: 'success' }
    } catch (error) {
      return { error }
    }
  }
}
