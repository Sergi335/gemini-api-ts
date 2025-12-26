import { Request, Response } from 'express'
import { getAuth } from 'firebase-admin/auth'
import { userModel } from '../models/userModel'

/* eslint-disable @typescript-eslint/no-extraneous-class */
export class authController {
  // Gestiona el inicio de sesión/registro con la cuenta de google
  static async googleLogin (req: Request, res: Response): Promise<void> {
    if (req.body.email !== undefined && req.body.email !== null && req.body.email !== '') {
      const user = await userModel.getUser({ email: req.body.email }) // Solo está sergiadn335@gmail.com
      // console.log(user)
      if (!('error' in user) && user._id !== undefined && user._id !== null) {
        res.send({ ...user, csrfToken: res.locals.csrfToken ?? '' })
      } else {
        const googleUser = await getAuth().getUser(req.body.uid)
        const nickname = googleUser.displayName ?? `user${Math.floor(Math.random() * 10000000000)}`
        console.log(googleUser)
        const user = {
          name: nickname,
          realName: googleUser.displayName,
          email: googleUser.email ?? '',
          newUser: true,
          profileImage: googleUser.photoURL,
          quota: 0,
          signMethod: 'google',
          googleId: googleUser.uid
        }
        const newUser = await userModel.createUser({ user })
        const test = await userModel.createDummyContent({ user: (newUser as any).email ?? '' })
        console.log('🚀 ~ file: authController.js:42 ~ usersController ~ googleLogin ~ test:', test)

        // res.send({ message: 'Usuario creado correctamente', newUser })
        res.send(newUser)
      }
    } else {
      res.send({ error: 'No se ha podido obtener el email del usuario' })
    }
  }

  static async getLoggedUserInfo (req: Request, res: Response): Promise<void> {
    try {
      const localUserInfo = await userModel.getUser({ email: req.body.email })
      console.log(localUserInfo) // TODO Modelo
      res.send(localUserInfo)
    } catch (error) {
      res.send({ error })
    }
  }

  // Register with mail and password
  static async setLoggedUserInfo (req: Request, res: Response): Promise<void> {
    try {
      getAuth()
        .getUser(req.body.uid)
        .then(async (userRecord) => {
          const nickname = (typeof req.body.nickname === 'string' && req.body.nickname !== '') ? req.body.nickname : `user${Math.floor(Math.random() * 10000000)}`
          // See the UserRecord reference doc for the contents of userRecord.
          const userData = JSON.parse(JSON.stringify(userRecord.toJSON()))
          userData.name = nickname
          userData.newUser = true
          userData.quota = 0
          console.log(userData)
          const user = await userModel.createUser({ user: userData })
          let email = ''
          if (user !== null && user !== undefined && typeof (user as any).email === 'string') {
            email = (user as any).email
          }
          const test = await userModel.createDummyContent({ user: email })
          console.log('🚀 ~ file: authController.js:42 ~ usersController ~ googleLogin ~ test:', test)
          res.send(user)
        })
        .catch((error) => {
          console.log('Error fetching user data:', error)
          res.send(error)
        })
    } catch (error) {
      res.send({ error })
    }
  }

  static async handleLogout (req: Request, res: Response): Promise<void> {
    res.clearCookie('csrfToken')
    res.clearCookie('session')
    res.send({ status: 'Logged out' }) // TODO: Comprobar que se borra la cookie de sesión
  }
}

// TODO email verification --> Comprobar código
export const handleEmailVerification = async (req: Request, res: Response): Promise<void> => {
  // const useremail = req.body.useremail
  const useremail = req.body.useremail
  getAuth()
    .generateEmailVerificationLink(useremail /*, actionCodeSettings */)
    .then((link) => {
      // Construct email verification template, embed the link and send
      // using custom SMTP server.
      // return sendCustomVerificationEmail(useremail, displayName, link)
    })
    .catch((error) => {
      console.log(error)
      // Some error occurred.
    })
}
// Que debemos almacenar del usuario en mongodb?

/**
 * email --> esto viene de firebase, es la base por la que vamos a identificar los recursos del usuario
 * urlImagen --> esto viene de firebase pero puede no venir - se puede cambiar
 * Nombre Real --> esto viene de firebase pero puede no venir - se puede cambiar
 * Nickname --> esto lo puede elegir el usuario
 * Bio --> esto lo puede elegir el usuario
 * website --> esto lo puede elegir el usuario
 * newUser --> esto lo ponemos nosotros para saber si es nuevo o no y servirle los recursos de bienvenida
 */
