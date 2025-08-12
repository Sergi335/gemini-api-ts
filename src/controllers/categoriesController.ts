import { Response } from 'express'
import { categoryModel } from '../models/categoryModel'
import { RequestWithUser } from '../types/express'

/* eslint-disable @typescript-eslint/no-extraneous-class */

export class categoriesController {
  static async getAllCategories (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      // Usuario ya validado por middleware validateUser
      const user = req.user?._id as string
      if (user === undefined || user === null || user === '') {
        return res.status(401).json({ status: 'fail', error: 'User ID is missing' })
      }
      const data = await categoryModel.getAllCategories({ user })
      return res.status(200).json({ status: 'success', data })
    } catch (error) {
      return res.status(500).send({ status: 'fail', error })
    }
  }

  static async getTopLevelCategories (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      // Usuario ya validado por middleware validateUser
      const user = req.user?._id as string
      const data = await categoryModel.getTopLevelCategories({ user })
      return res.status(200).json({ status: 'success', data })
    } catch (error) {
      return res.status(500).send({ status: 'fail', error })
    }
  }

  static async getCategoriesByParentSlug (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      // Usuario ya validado por middleware validateUser
      const user = req.user?._id as string
      const { slug } = req.params
      console.log('🚀 ~ categoriesController ~ getCategoriesByParentSlug ~ slug:', slug)
      const data = await categoryModel.getCategoriesByParentSlug({ user, parentSlug: slug })
      return res.status(200).json({ status: 'success', data })
    } catch (error) {
      return res.status(500).send({ status: 'fail', error })
    }
  }

  static async createCategory (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      // Usuario ya validado por middleware validateUser
      const user = req.user?._id as string
      // Body ya validado por middleware validateBody
      // req.body.user = user
      const cleanData = req.body
      const category = await categoryModel.createCategory({ user, cleanData })
      return res.status(201).json({ status: 'success', category })
    } catch (error) {
      return res.status(500).send({ status: 'fail', error })
    }
  }

  static async updateCategory (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      // Usuario ya validado por middleware validateUser
      const user = req.user?._id as string
      // Body ya validado por middleware validateBody
      const { updates } = req.body
      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ status: 'fail', error: 'Invalid updates array' })
      }
      updates.forEach(update => {
        update.user = user
      })

      const updatedData = await categoryModel.newUpdateCategory({ updates })
      return res.status(200).json({ status: 'success', updatedData })
    } catch (error) {
      return res.status(500).send({ status: 'fail', error })
    }
  }

  static async deleteCategory (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      // Usuario ya validado por middleware validateUser
      const user = req.user?._id as string
      // Body ya validado por middleware validateBody
      const { id, level } = req.body
      const column = await categoryModel.deleteCategory({ id, user, level })
      return res.status(200).json({ status: 'success', column })
    } catch (error) {
      return res.status(500).send({ status: 'fail', error })
    }
  }
}
