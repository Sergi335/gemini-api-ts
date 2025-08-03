import Express from 'express'
import { authController } from '../../controllers/authController'
import { userController } from '../../controllers/userController'
import { checkUserSession } from '../../middlewares/checkUserSession'
import { setSessionCookie } from '../../middlewares/setSessionCookie'
import {
  loginBodySchema,
  registerBodySchema,
  updateUserBodySchema
} from '../../middlewares/validation/validationSchemas'
import { validateBody } from '../../middlewares/validation/zodValidator'

export const authRouter = Express.Router()

// Rutas públicas con validación de body
authRouter.post('/login',
  validateBody(loginBodySchema),
  setSessionCookie,
  authController.getLoggedUserInfo
)
authRouter.post('/googlelogin',
  validateBody(loginBodySchema),
  setSessionCookie,
  authController.googleLogin
)
authRouter.post('/register',
  validateBody(registerBodySchema),
  setSessionCookie,
  authController.setLoggedUserInfo
)
authRouter.post('/logout',
  setSessionCookie,
  authController.handleLogout
)

// Rutas protegidas con validación de sesión y body
authRouter.patch('/updateuser',
  checkUserSession,
  validateBody(updateUserBodySchema),
  userController.editUserInfo
)
authRouter.delete('/deleteuser',
  checkUserSession,
  userController.deleteUserInfo
)
