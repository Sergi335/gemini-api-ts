import { categoryModel } from '../models/categoryModel'
import { Response } from 'express'
import { validateCreateCategory, validateUpdateCategory } from '../validation/categoriesZodSchema'
import { RequestWithUser } from '../types/express'

/* eslint-disable @typescript-eslint/no-extraneous-class */

export class categoriesController {
  static async getAllCategories (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      const user = req.user?.name
      if (user === undefined || user === null || user === '') {
        return res.status(401).json({ status: 'fail', message: 'Usuario no autenticado' })
      }
      const data = await categoryModel.getAllCategories({ user })
      return res.status(200).json({ status: 'success', data })
    } catch (error) {
      return res.status(500).send({ status: 'fail', error })
    }
  }

  static async createCategory (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      const user = req.user?.name
      if (user === undefined || user === null || user === '') {
        return res.status(401).json({ status: 'fail', message: 'Usuario no autenticado' })
      }
      req.body.user = user
      const validatedCol = validateCreateCategory(req.body)
      // Crear mensaje de error
      if (!validatedCol.success) {
        const errorsMessageArray = validatedCol.error?.issues.map((error: any) => {
          return error.message
        })
        return res.status(400).json({ status: 'fail', message: errorsMessageArray })
      }
      const cleanData = validatedCol.data
      const category = await categoryModel.createCategory({ user, cleanData })
      return res.status(201).json({ status: 'success', category })
    } catch (error) {
      return res.status(500).send({ status: 'fail', error })
    }
  }

  static async updateCategory (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      // El id no se valida, los columnsids tampoco
      const user = req.user?.name
      if (user === undefined || user === null || user === '') {
        return res.status(401).json({ status: 'fail', message: 'Usuario no autenticado' })
      }
      const { fields, id } = req.body
      let elements
      if (typeof req.body.columnsIds !== 'undefined' && req.body.columnsIds !== null) {
        elements = req.body.columnsIds
      }
      const validatedCol = validateUpdateCategory(fields)

      // Crear mensaje de error
      if (!validatedCol.success) {
        const errorsMessageArray = validatedCol.error?.issues.map((error: any) => {
          return error.message
        })
        return res.status(400).json({ status: 'fail', message: errorsMessageArray })
      }
      const cleanData = validatedCol.data
      const column = await categoryModel.updateCategory({ user, id, cleanData, elements })
      return res.status(201).json({ status: 'success', column }) // No siempre es success esto solo peta con errores gordos
    } catch (error) {
      return res.status(500).send({ status: 'fail', error })
    }
  }

  static async deleteCategory (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      const user = req.user?.name
      if (user === undefined || user === null || user === '') {
        return res.status(401).json({ status: 'fail', message: 'Usuario no autenticado' })
      }
      const id = req.body.id
      const column = await categoryModel.deleteCategory({ id, user })
      return res.status(200).json({ status: 'success', column })
    } catch (error) {
      return res.status(500).send({ status: 'fail', error })
    }
  }
}
