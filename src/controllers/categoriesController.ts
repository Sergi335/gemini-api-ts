import { Response } from 'express'
import { categoryModel } from '../models/categoryModel'
import { RequestWithUser } from '../types/express'

/* eslint-disable @typescript-eslint/no-extraneous-class */

export class categoriesController {
  static async getAllCategories (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      // Usuario ya validado por middleware validateUser
      const user = req.user?.name as string
      const data = await categoryModel.getAllCategories({ user })
      return res.status(200).json({ status: 'success', data })
    } catch (error) {
      return res.status(500).send({ status: 'fail', error })
    }
  }

  static async getTopLevelCategories (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      // Usuario ya validado por middleware validateUser
      const user = req.user?.name as string
      const data = await categoryModel.getTopLevelCategories({ user })
      return res.status(200).json({ status: 'success', data })
    } catch (error) {
      return res.status(500).send({ status: 'fail', error })
    }
  }

  static async updateNestingCategories (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      // Usuario ya validado por middleware validateUser
      const user = req.user?.name as string
      // Body ya validado por middleware validateBody
      console.log('req.body', req.body)
      const receivedData = req.body

      // const data = await categoryModel.updateNestingCategories({ user, categories })
      return res.status(200).json({ status: 'success', receivedData, user })
    } catch (error) {
      return res.status(500).send({ status: 'fail', error })
    }
  }

  static async updateReorderingCategories (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      // Usuario ya validado por middleware validateUser
      const user = req.user?.name as string
      // Body ya validado por middleware validateBody
      console.log('req.body', req.body)
      const receivedData = req.body

      // const data = await categoryModel.updateNestingCategories({ user, categories })
      return res.status(200).json({ status: 'success', receivedData, user })
    } catch (error) {
      return res.status(500).send({ status: 'fail', error })
    }
  }

  static async createCategory (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      // Usuario ya validado por middleware validateUser
      const user = req.user?.name as string
      // Body ya validado por middleware validateBody
      req.body.user = user
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
      const user = req.user?.name as string
      // Body ya validado por middleware validateBody
      const { fields, id, columnsIds } = req.body
      const elements = columnsIds // Mantener compatibilidad con el modelo

      const column = await categoryModel.updateCategory({ user, id, cleanData: fields, elements })
      return res.status(200).json({ status: 'success', column })
    } catch (error) {
      return res.status(500).send({ status: 'fail', error })
    }
  }

  static async deleteCategory (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      // Usuario ya validado por middleware validateUser
      const user = req.user?.name as string
      // Body ya validado por middleware validateBody
      const { id } = req.body
      const column = await categoryModel.deleteCategory({ id, user })
      return res.status(200).json({ status: 'success', column })
    } catch (error) {
      return res.status(500).send({ status: 'fail', error })
    }
  }
}
