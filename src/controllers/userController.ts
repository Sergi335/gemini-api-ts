import { Response } from 'express'
import { categoryModel } from '../models/categoryModel'
import { userModel } from '../models/userModel'
import { RequestWithUser } from '../types/express'
import { constants } from '../utils/constants'
import { storageController } from './storageController'

/* eslint-disable @typescript-eslint/no-extraneous-class */
export class userController {
  // A userController
  static async editUserInfo (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      const email = req.user?.email

      if (email === undefined || email === null || email === '') {
        return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
      }

      const userData = await userModel.getUser({ email })

      if (!('error' in userData) && userData._id !== undefined && userData._id !== null) {
        const data = await userModel.editUser({ email, fields: req.body.fields })
        return res.status(200).json({ ...constants.API_SUCCESS_RESPONSE, data })
      } else {
        return res.status(404).json({ ...constants.API_FAIL_RESPONSE, error: 'El usuario no existe' })
      }
    } catch (error) {
      console.error('Error al editar la información del usuario:', error)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE, error: 'Error interno del servidor' })
    }
  }

  // A userController
  static async deleteUserInfo (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      const email = req.user?.email

      if (email === undefined || email === null || email === '') {
        return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
      }

      const data = await categoryModel.deleteUserData({ user: email })
      await storageController.deleteAllUserFiles({ user: email })
      return res.status(200).json({ ...constants.API_SUCCESS_RESPONSE, data })
    } catch (error) {
      console.error('Error al eliminar la información del usuario:', error)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE, error: 'Error al eliminar la información del usuario' })
    }
  }

  // A userController
  static async deleteUserData (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      const email = req.user?.email

      if (email === undefined || email === null || email === '') {
        return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
      }
      const userDataDeleted = await categoryModel.deleteUserData({ user: email })
      const userDeleted = await userModel.deleteUser({ email })
      const filesDeleted = await storageController.deleteAllUserFiles({ user: email })
      return res.status(200).json({ ...constants.API_SUCCESS_RESPONSE, data: { userDataDeleted, userDeleted, filesDeleted } })
    } catch (error) {
      console.error('Error al eliminar los datos del usuario:', error)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE, error: 'Error al eliminar los datos del usuario' })
    }
  }
}
