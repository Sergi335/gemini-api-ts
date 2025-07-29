import admin, { ServiceAccount } from 'firebase-admin'
import { getAuth } from 'firebase-admin/auth'
import { Request, Response, NextFunction } from 'express'
import { categoryModel } from '../models/categoryModel'
import { userModel } from '../models/userModel'
import { storageController } from './storageController'

const getEnvOrThrow = (key: string): string => {
  const value = process.env[key]
  if (value === undefined || value === null || value === '') throw new Error(`Missing required environment variable: ${key}`)
  return value
}

const getPrivateKeyOrThrow = (): string => {
  const key = process.env.FBADMIN_PRIVATE_KEY
  if (key === undefined || key === null || key === '') {
    throw new Error('Missing required environment variable: FBADMIN_PRIVATE_KEY')
  }
  try {
    return JSON.parse(key)
  } catch {
    return key
  }
}

const serviceAccount: ServiceAccount = {
  type: getEnvOrThrow('FBADMIN_TYPE'),
  project_id: getEnvOrThrow('FBADMIN_PROJECT_ID'),
  private_key_id: getEnvOrThrow('FBADMIN_PRIVATE_KEY_ID'),
  private_key: getPrivateKeyOrThrow(),
  client_email: getEnvOrThrow('FBADMIN_CLIENT_EMAIL'),
  client_id: getEnvOrThrow('FBADMIN_CLIENT_ID'),
  auth_uri: getEnvOrThrow('FBADMIN_AUTH_URI'),
  token_uri: getEnvOrThrow('FBADMIN_TOKEN_URI'),
  auth_provider_x509_cert_url: getEnvOrThrow('FBADMIN_AUTH_PROV_509'),
  client_x509_cert_url: getEnvOrThrow('FBADMIN_CLIENT_509'),
  universe_domain: getEnvOrThrow('FBADMIN_UNIVERSE_DOM')
} as any

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})
/* eslint-disable @typescript-eslint/no-extraneous-class */
export class usersController {
  // Gestiona el inicio de sesión/registro con la cuenta de google
  static async googleLogin (req: Request, res: Response): Promise<void> {
    if (req.body.email !== undefined && req.body.email !== null && req.body.email !== '') {
      const user = await userModel.getUser({ email: req.body.email })
      console.log(user)
      if (user._id !== undefined && user._id !== null) {
        res.send(user)
      } else {
        const googleUser = await getAuth().getUser(req.body.uid)
        const nickname = googleUser.displayName ?? `user${Math.floor(Math.random() * 10000000000)}`
        console.log(googleUser)
        const user = {
          name: nickname,
          realName: googleUser.displayName,
          email: googleUser.email ?? '', // Ensure email is always a string
          newUser: true,
          profileImage: googleUser.photoURL,
          quota: 0,
          signMethod: 'google',
          googleId: googleUser.uid
        }
        const newUser = await userModel.createUser({ user })
        const test = await categoryModel.createDummyContent({ user: (newUser as any).email ?? '' })
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
          const test = await categoryModel.createDummyContent({ user: user.email })
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

  static async editUserInfo (req: Request, res: Response): Promise<void> {
    try {
      const user = await userModel.getUser({ email: req.body.email })
      console.log(user)
      if (user._id !== undefined && user._id !== null) {
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

  static async handleLogout (req: Request, res: Response): Promise<void> {
    res.clearCookie('session').send({ status: 'Logged out' })
    // res.redirect('/login')
  }

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
}
// El usuario ya está autenticado en firebase, esta función:
// Comprueba el csrfToken y crea una cookie de sesión
export const sessionCookieMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (
      typeof req.body.idToken !== 'string' ||
      req.body.idToken.trim() === '' ||
      typeof req.body.csrfToken !== 'string' ||
      req.body.csrfToken.trim() === ''
    ) {
      res.status(400).send({ error: 'BAD REQUEST! FALTAN DATOS' })
      return
    }
    // console.log(req.body)
    // console.log(req.cookies)
    // Get the ID token passed and the CSRF token.
    const idToken = req.body.idToken.toString()
    // const csrfToken = req.body.csrfToken.toString()
    // Guard against CSRF attacks.
    // if (csrfToken !== req.csrfToken) {
    //   res.status(401).send('NO COINCIDE UNAUTHORIZED REQUEST!')
    //   return
    // }
    // Set session expiration to 5 days.
    const expiresIn = 60 * 60 * 24 * 5 * 1000
    // Create the session cookie. This will also verify the ID token in the process.
    // The session cookie will have the same claims as the ID token.
    // To only allow session cookie setting on recent sign-in, auth_time in ID token
    // can be checked to ensure user was recently signed in before creating a session cookie.
    getAuth()
      .createSessionCookie(idToken, { expiresIn })
      .then(
        (sessionCookie) => {
          // Set cookie policy for session cookie.
          const options = { maxAge: expiresIn, httpOnly: true, secure: true, sameSite: 'none' as const }
          console.log('Cookie creada con éxito')
          res.cookie('session', sessionCookie, options)
          next()
        },
        (error) => {
          console.log(error)
          res.status(401).send('UNAUTHORIZED REQUEST!')
        }
      )
  } catch (error) {
    res.send({ error: 'ERROR INEXPLICABLE' })
  }
}

// TODO crear un middleware que compruebe si el usuario está autenticado
export const checkUserSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const sessionCookie = req.cookies?.session ?? undefined
  const logMessage = `Petición ${Date.now()}, url: ${req.baseUrl}, method: ${req.method}, cookies: ${typeof sessionCookie === 'string' ? sessionCookie.length : 0}}`
  if (sessionCookie === undefined) {
    res.status(401).send({ error: 'NOT COOKIE!' }) // por que si le mando un 401 da error de cors?
    return
  }
  // Verify the session cookie. In this case an additional check is added to detect
  // if the user's Firebase session was revoked, user deleted/disabled, etc.
  getAuth()
    .verifySessionCookie(sessionCookie, true /** checkRevoked */)
    .then(decodedClaims => {
      if (decodedClaims.email === 'sergiadn@hotmail.com') {
        req.user = { name: 'sergiadn@hotmail.com' }
        // Estamos logeados con la cuenta de sergiadn@hotmail, pero con el nombre de sergiadn335@gmail.com (SergioSR) y por lo tanto sus datos
        console.log(`${logMessage} --> Usuario con email ${decodedClaims.email} autenticado correctamente como ${req.user.name}`)
      } else {
        req.user = { name: decodedClaims.email ?? '' }
        console.log(`${logMessage} --> Usuario con email ${decodedClaims.email ?? ''} autenticado correctamente`)
      }
      next()
    })
    .catch((error) => {
      // Session cookie is unavailable or invalid. Force user to login.
      console.log('Error desde el Middeware')
      console.log('🚀 ~ file: authController.js:168 ~ checkUserSession ~ sessionCookie:', sessionCookie.length)
      console.log(error)
      res.status(401).send({ error: 'MIDDLEWARE UNAUTHORIZE REQUEST!' })
    })
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
