import { Request, Response } from 'express'
import { categoryModel } from '../models/categoryModel'
import { userModel } from '../models/userModel'
import { storageController } from './storageController'

/* eslint-disable @typescript-eslint/no-extraneous-class */
export class userController {
  // A userController
  static async editUserInfo (req: Request, res: Response): Promise<void> {
    try {
      const user = await userModel.getUser({ email: req.body.email })
      console.log(user)
      if (!('error' in user) && user._id !== undefined && user._id !== null) {
        const data = await userModel.editUser({ email: req.body.email, user: req.body.fields })
        res.send({ message: 'edición correcta', data })
      } else {
        res.send({ error: 'El usuario no existe' })
      }
      // res.send({ message: 'edit user' })
    } catch (error) {
      res.send({ error })
    }
  }

  // A userController
  static async deleteUserInfo (req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body
      const data = await categoryModel.deleteUserData({ user: email })
      await storageController.deleteAllUserFiles({ user: email })
      res.send({ status: 'success', data })
    } catch (error) {
      console.log(error)
      res.send({ error })
    }
  }

  // A userController
  static async deleteUserData (req: Request, res: Response): Promise<void> {
    try {
      const { user } = req.body
      const userDataDeleted = await categoryModel.deleteUserData({ user })
      const userDeleted = await userModel.deleteUser({ email: user })
      const filesDeleted = await storageController.deleteAllUserFiles({ user })
      res.send({ userDataDeleted, userDeleted, filesDeleted })
    } catch (error) {
      res.send({ error })
    }
  }
}
