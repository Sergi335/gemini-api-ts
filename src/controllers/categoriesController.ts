import { categoryModel } from '../models/categoryModel'
import { Request, Response } from 'express'
import { validateCreateCategory, validateUpdateCategory } from '../validation/categoriesZodSchema'
/* eslint-disable @typescript-eslint/no-extraneous-class */
interface User {
  name: string
  // add other user properties if needed
}

interface RequestWithUser extends Request {
  user: User
}

export class categoriesController {
  static async getAllCategories (req: RequestWithUser, res: Response): Promise<Response> {
    const user = req.user.name
    try {
      const data = await categoryModel.getAllCategories({ user })
      return res.status(200).json({ status: 'success', data })
    } catch (error) {
      return res.status(500).send({ status: 'fail', error })
    }
  }

  static async createColumn (req: RequestWithUser, res: Response): Promise<Response> {
    const user = req.user.name
    // const { nombre, escritorio, orden } = req.body
    // comprobar que hay suficientes datos al menos el usuario
    req.body.user = user
    const validatedCol = validateCreateCategory(req.body)
    // console.log(validatedCol.error.errors.path)
    // Crear mensaje de error
    if (!validatedCol.success) {
      const errorsMessageArray = validatedCol.error?.issues.map((error: any) => {
        return error.message
      })
      return res.status(400).json({ status: 'fail', message: errorsMessageArray })
    }
    const cleanData = validatedCol.data
    try {
      const column = await categoryModel.createCategory({ user, cleanData })
      return res.status(201).json({ status: 'success', column })
    } catch (error) {
      return res.status(500).send({ status: 'fail', error })
    }
  }

  static async updateColumn (req: RequestWithUser, res: Response): Promise<Response> {
    // El id no se valida, los columnsids tampoco
    const user = req.user.name
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

    try {
      const column = await categoryModel.updateCategory({ user, id, cleanData, elements })
      return res.status(201).json({ status: 'success', column }) // No siempre es success esto solo peta con errores gordos
    } catch (error) {
      return res.status(500).send({ status: 'fail', error })
    }
  }

  static async deleteColumn (req: RequestWithUser, res: Response): Promise<Response> {
    const user = req.user.name
    const id = req.body.id
    try {
      const column = await categoryModel.deleteCategory({ id, user })
      return res.status(200).json({ status: 'success', column })
    } catch (error) {
      return res.status(500).send({ status: 'fail', error })
    }
  }
}
