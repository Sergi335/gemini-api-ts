import { Response } from 'express'
import mongoose from 'mongoose'
import { linkModel } from '../models/linkModel'
import { RequestWithUser } from '../types/express'
import { constants } from '../utils/constants'
import { getLinkNameByUrlLocal, getLinkStatusLocal } from '../utils/linksUtils'

/* eslint-disable @typescript-eslint/no-extraneous-class */
export class linksController {
  static async getAllLinks (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      const user = req.user?._id
      if (user === undefined || user === null || user === '') {
        return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
      }
      const data = await linkModel.getAllLinks({ user })
      return res.status(200).json({ ...constants.API_SUCCESS_RESPONSE, data })
    } catch (error) {
      console.error('Error in getAllLinks:', error)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE })
    }
  }

  static async getLinkById (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      const user = req.user?._id
      if (user === undefined || user === null || user === '') {
        return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
      }
      console.log(req.params)
      console.log('Entramos en by id')

      const link = await linkModel.getLinkById({ user, id: req.params.id })
      return res.status(200).json({ ...constants.API_SUCCESS_RESPONSE, data: link })
    } catch (error) {
      console.error('Error in getLinkById:', error)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE })
    }
  }

  static async getLinksByTopCategoryId (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      console.log(req.user)
      const user = req.user?._id
      if (user === undefined || user === null || user === '') {
        return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
      }
      console.log('Entramos en by desktop')
      console.log(req.query)

      const topCategory = typeof req.query.category === 'string' ? req.query.category : ''
      const data = await linkModel.getLinksByTopCategoryId({ user, id: topCategory })
      if (!Array.isArray(data) && typeof data === 'object' && 'error' in data) {
        return res.status(404).json({ ...constants.API_FAIL_RESPONSE, error: 'Categoría no encontrada' })
      }
      return res.status(200).json({ ...constants.API_SUCCESS_RESPONSE, data })
    } catch (error) {
      console.error('Error in getLinksByTopCategoryId:', error)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE })
    }
  }

  static async getLinksCount (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      const user = req.user?._id
      if (user === undefined || user === null || user === '') {
        return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
      }

      console.log(req.query)

      const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId : undefined
      console.log('🚀 ~ linksController ~ getLinksCount ~ category:', categoryId)
      if (categoryId === undefined || categoryId === '') {
        return res.status(400).json({ ...constants.API_FAIL_RESPONSE, error: 'categoryId es requerido' })
      }
      const linksCount = await linkModel.getLinksCount({ user, categoryId })
      return res.status(200).json({ ...constants.API_SUCCESS_RESPONSE, data: linksCount })
    } catch (error) {
      console.error('Error in getLinksCount:', error)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE })
    }
  }

  static async createLink (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      const user = req.user?._id
      if (user === undefined || user === null || user === '') {
        return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
      }

      // El middleware de validación ya se ha ejecutado
      const validatedLink = req.body

      const userObjectId = new mongoose.Types.ObjectId(user)
      const cleanData = {
        ...validatedLink,
        user: userObjectId,
        categoryId: (validatedLink.categoryId != null) ? new mongoose.Types.ObjectId(validatedLink.categoryId) : undefined
      }
      const data = await linkModel.createLink({ cleanData })
      return res.status(201).json({ ...constants.API_SUCCESS_RESPONSE, data })
    } catch (error) {
      console.error('Error en createLink:', error)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE })
    }
  }

  static async updateLink (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      // Usuario ya validado por middleware validateUser
      const user = req.user?._id
      if (user === undefined || user === null || user === '') {
        return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
      }
      const { updates } = req.body
      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ ...constants.API_FAIL_RESPONSE, error: 'Invalid updates array' })
      }
      updates.forEach(update => {
        update.user = user
      })

      const updatedData = await linkModel.newUpdateLink({ updates })
      return res.status(200).json({ ...constants.API_SUCCESS_RESPONSE, data: updatedData })
    } catch (error) {
      console.error('Error in updateLink:', error)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE })
    }
  }

  static async deleteLink (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      const user = req.user?._id
      if (user === undefined || user === null || user === '') {
        return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
      }
      const { linkId } = req.body
      const link = await linkModel.deleteLink({ user, linkId })
      if (link !== null && 'error' in link) {
        return res.status(404).json({ ...constants.API_FAIL_RESPONSE, error: 'El link no existe' })
      }
      return res.status(200).json({ ...constants.API_SUCCESS_RESPONSE, data: link })
    } catch (error) {
      console.error('Error in deleteLink:', error)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE })
    }
  }

  static async bulkMoveLinks (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      const user = req.user?._id
      if (user === undefined || user === null || user === '') {
        return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
      }
      const { destinationCategoryId, links, previousCategoryId } = req.body

      const link = await linkModel.bulkMoveLinks({ user, destinationCategoryId, previousCategoryId, links })
      return res.status(200).json({ ...constants.API_SUCCESS_RESPONSE, data: link })
    } catch (error) {
      console.error('Error in bulkMoveLinks:', error)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE })
    }
  }

  static async getLinkNameByUrl (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      const user = req.user?._id
      if (user === undefined || user === null || user === '') {
        return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
      }
      const url = typeof req.query.url === 'string' ? req.query.url : ''
      const data = await getLinkNameByUrlLocal({ url })
      return res.status(200).json({ ...constants.API_SUCCESS_RESPONSE, data })
    } catch (error) {
      console.error('Error in getLinkNameByUrl:', error)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE })
    }
  }

  static async getLinkStatus (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      const user = req.user?._id
      if (user === undefined || user === null || user === '') {
        return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
      }
      const url = typeof req.query.url === 'string' ? req.query.url : ''
      const data = await getLinkStatusLocal({ url })
      return res.status(200).json({ ...constants.API_SUCCESS_RESPONSE, data })
    } catch (error) {
      console.error('Error in getLinkStatus:', error)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE })
    }
  }

  static async findDuplicateLinks (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      const user = req.user?._id
      if (user === undefined || user === null || user === '') {
        return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
      }
      const data = await linkModel.findDuplicateLinks({ user })
      return res.status(200).json({ ...constants.API_SUCCESS_RESPONSE, data })
    } catch (error) {
      console.error('Error in findDuplicateLinks:', error)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE })
    }
  }

  static async setBookMarksOrder (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      const user = req.user?._id
      if (user === undefined || user === null || user === '') {
        return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
      }
      const { links } = req.body
      console.log('🚀 ~ linksController ~ setBookMarksOrder ~ links:', links)

      const data = await linkModel.setBookMarksOrder({ user, links })
      return res.status(200).send({ ...constants.API_SUCCESS_RESPONSE, data })
    } catch (error) {
      console.error('Error in setBookMarksOrder:', error)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE })
    }
  }
}
