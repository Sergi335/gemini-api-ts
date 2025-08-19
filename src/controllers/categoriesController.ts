import { Response } from 'express'
import { categoryModel } from '../models/categoryModel'
import { RequestWithUser } from '../types/express'
import { constants } from '../utils/constants'

/* eslint-disable @typescript-eslint/no-extraneous-class */
export class categoriesController {
  static async getAllCategories (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      // Usuario ya validado por middleware validateUser
      const user = req.user?._id
      if (user === undefined || user === null || user === '') {
        return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
      }
      const data = await categoryModel.getAllCategories({ user })
      return res.status(200).json({
        ...constants.API_SUCCESS_RESPONSE,
        data
      })
    } catch (error) {
      console.error('Error in getAllCategories:', error)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE })
    }
  }

  static async getTopLevelCategories (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      // Usuario ya validado por middleware validateUser
      const user = req.user?._id
      if (user === undefined || user === null || user === '') {
        return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
      }
      const data = await categoryModel.getTopLevelCategories({ user })
      return res.status(200).json({
        ...constants.API_SUCCESS_RESPONSE,
        data
      })
    } catch (error) {
      console.error('Error in getTopLevelCategories:', error)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE })
    }
  }

  // static async getCategoriesByParentSlug (req: RequestWithUser, res: Response): Promise<Response> {
  //   try {
  //     // Usuario ya validado por middleware validateUser
  //     const user = req.user?._id as string
  //     const { slug } = req.params
  //     console.log('🚀 ~ categoriesController ~ getCategoriesByParentSlug ~ slug:', slug)
  //     const data = await categoryModel.getCategoriesByParentSlug({ user, parentSlug: slug })
  //     return res.status(200).json({ status: 'success', data })
  //   } catch (error) {
  //     return res.status(500).send({ status: 'fail', error })
  //   }
  // }

  static async createCategory (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      // Usuario ya validado por middleware validateUser
      const user = req.user?._id
      if (user === undefined || user === null || user === '') {
        return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
      }
      const fields = req.body
      const category = await categoryModel.createCategory({ user, fields })
      return res.status(201).json({ ...constants.API_SUCCESS_RESPONSE, data: category })
    } catch (error) {
      console.error('Error in createCategory:', error)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE })
    }
  }

  static async updateCategory (req: RequestWithUser, res: Response): Promise<Response> {
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

      const updatedData = await categoryModel.updateCategory({ updates })
      return res.status(200).json({ ...constants.API_SUCCESS_RESPONSE, data: updatedData })
    } catch (error) {
      console.error('Error in updateCategory:', error)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE, error: 'Error inesperado' })
    }
  }

  static async deleteCategory (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      // Usuario ya validado por middleware validateUser
      const user = req.user?._id as string
      if (user === undefined || user === null || user === '') {
        return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
      }
      const { id, level } = req.body
      const column = await categoryModel.deleteCategory({ id, user, level })
      if ('error' in column) {
        return res.status(404).json({ ...constants.API_FAIL_RESPONSE, error: 'Categoría no encontrada' })
      }
      return res.status(200).json({ ...constants.API_SUCCESS_RESPONSE, data: column })
    } catch (error) {
      console.error('Error in deleteCategory:', error)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE, error: 'Error inesperado' })
    }
  }
}
