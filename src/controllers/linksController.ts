import { Response } from 'express'
import mongoose from 'mongoose'
import { linkModel } from '../models/linkModel'
import { RequestWithUser } from '../types/express'
import { getLinkNameByUrlLocal, getLinkStatusLocal } from '../utils/linksUtils'
// import { validatePartialLink } from '../validation/linksZodSchema'

/* eslint-disable @typescript-eslint/no-extraneous-class */
export class linksController {
  static async getAllLinks (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      const user = req.user?._id
      if (user === undefined || user === null || user === '') {
        return res.status(401).json({ status: 'fail', message: 'Usuario no autenticado' })
      }
      const data = await linkModel.getAllLinks({ user })
      return res.status(200).json({ status: 'success', data })
    } catch (error) {
      return res.status(500).send(error)
    }
  }

  static async getLinkById (req: RequestWithUser, res: Response): Promise<Response> {
    const user = req.user?._id
    if (user === undefined || user === null || user === '') {
      return res.status(401).json({ status: 'fail', message: 'Usuario no autenticado' })
    }
    console.log(req.params)
    console.log('Entramos en by id')
    try {
      const link = await linkModel.getLinkById({ user, id: req.params.id })
      return res.status(200).json(link)
    } catch (error) {
      return res.status(500).send(error)
    }
  }

  static async getAllLinksByCategory (req: RequestWithUser, res: Response): Promise<Response> {
    console.log(req.user)
    const user = req.user?._id
    if (user === undefined || user === null || user === '') {
      return res.status(401).json({ status: 'fail', message: 'Usuario no autenticado' })
    }
    console.log('Entramos en by desktop')
    console.log(req.query)
    try {
      const topCategory = typeof req.query.category === 'string' ? req.query.category : ''
      const data = await linkModel.getLinksByTopCategory({ user, topCategory })
      return res.status(200).json({ status: 'success', data })
    } catch (error) {
      return res.status(500).send(error)
    }
  }

  static async getLinksCount (req: RequestWithUser, res: Response): Promise<Response> {
    const user = req.user?._id
    if (user === undefined || user === null || user === '') {
      return res.status(401).json({ status: 'fail', message: 'Usuario no autenticado' })
    }
    try {
      console.log(req.query)

      const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId : undefined
      console.log('🚀 ~ linksController ~ getLinksCount ~ category:', categoryId)
      if (categoryId === undefined || categoryId === '') {
        return res.status(400).json({ status: 'fail', message: 'Categoría no proporcionada' })
      }
      const linksCount = await linkModel.getLinksCount({ user, categoryId })
      return res.status(200).json(linksCount)
    } catch (error) {
      return res.status(500).send(error)
    }
  }

  static async createLink (req: RequestWithUser, res: Response): Promise<Response> {
    const user = req.user?._id
    if (user === undefined || user === null || user === '') {
      return res.status(401).json({ status: 'fail', message: 'Usuario no autenticado' })
    }

    // El middleware de validación ya se ha ejecutado
    const validatedLink = req.body

    try {
      const userObjectId = new mongoose.Types.ObjectId(user)
      const cleanData = {
        ...validatedLink,
        user: userObjectId,
        categoryId: (validatedLink.categoryId != null) ? new mongoose.Types.ObjectId(validatedLink.categoryId) : undefined
      }
      const data = await linkModel.createLink({ cleanData })
      return res.status(201).json({ status: 'success', link: data })
    } catch (error) {
      console.error('Error en createLink:', error)
      return res.status(500).send(error)
    }
  }

  static async updateLink (req: RequestWithUser, res: Response): Promise<Response> {
    const user = req.user?._id
    if (user === undefined || user === null || user === '') {
      return res.status(401).json({ status: 'fail', message: 'Usuario no autenticado' })
    }

    // El middleware de validación ya se ha ejecutado
    // const cleanData = req.body
    // const { id } = req.params
    // const { idpanelOrigen, destinyIds } = req.query
    // DestinyIds se usa para ordenar los links en la categoría destino
    const { id, idpanelOrigen, destinyIds, fields } = req.body
    console.log('LinkController', req.body)

    try {
      const link = await linkModel.updateLink({
        id,
        user,
        oldCategoryId: typeof idpanelOrigen === 'string' ? idpanelOrigen : undefined,
        fields,
        destinyIds: typeof destinyIds === 'string' ? JSON.parse(destinyIds) : undefined
      })
      return res.status(200).json({ status: 'success', link })
    } catch (error) {
      return res.status(500).send(error)
    }
  }

  static async deleteLink (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      const user = req.user?._id
      if (user === undefined || user === null || user === '') {
        return res.status(401).json({ status: 'fail', message: 'Usuario no autenticado' })
      }
      const { linkId } = req.body
      const link = await linkModel.deleteLink({ user, linkId })
      if (link !== null && 'error' in link) {
        return res.status(404).send({ status: 'fail', message: 'El link no existe' })
      }
      return res.status(200).json({ status: 'success', link })
    } catch (error) {
      return res.status(500).send(error)
    }
  }

  static async bulkMoveLinks (req: RequestWithUser, res: Response): Promise<Response> {
    const user = req.user?._id
    if (user === undefined || user === null || user === '') {
      return res.status(401).json({ status: 'fail', message: 'Usuario no autenticado' })
    }
    const { source, destiny, panel, links, escritorio } = req.body
    try {
      const link = await linkModel.bulkMoveLinks({ user, source, destiny, panel, links, escritorio })
      return res.status(200).send({ status: 'success', link })
    } catch (error) {
      return res.status(500).send(error)
    }
  }

  static async getLinkNameByUrl (req: RequestWithUser, res: Response): Promise<Response> {
    const url = typeof req.query.url === 'string' ? req.query.url : ''
    const data = await getLinkNameByUrlLocal({ url })
    return res.send(data)
  }

  static async getLinkStatus (req: RequestWithUser, res: Response): Promise<Response> {
    const url = typeof req.query.url === 'string' ? req.query.url : ''
    const data = await getLinkStatusLocal({ url })
    return res.send(data)
  }

  static async findDuplicateLinks (req: RequestWithUser, res: Response): Promise<Response> {
    const user = req.user?._id
    if (user === undefined || user === null || user === '') {
      return res.status(401).json({ status: 'fail', message: 'Usuario no autenticado' })
    }
    const data = await linkModel.findDuplicateLinks({ user })
    return res.send(data)
  }

  static async setBookMarksOrder (req: RequestWithUser, res: Response): Promise<Response> {
    const user = req.user?._id
    if (user === undefined || user === null || user === '') {
      return res.status(401).json({ status: 'fail', message: 'Usuario no autenticado' })
    }
    const { links } = req.body
    console.log('🚀 ~ linksController ~ setBookMarksOrder ~ links:', links)
    try {
      const data = await linkModel.setBookMarksOrder({ user, links })
      return res.status(200).send({ status: 'success', data })
    } catch (error) {
      return res.status(500).send(error)
    }
  }
}
