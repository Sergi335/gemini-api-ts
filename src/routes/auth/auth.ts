import Express from 'express'
import { authController } from '../../controllers/authController'
import { userController } from '../../controllers/userController'
import { sessionCookieMiddleware } from '../../middlewares/sessionCookie'
import { checkUserSession } from '../../middlewares/checkSession'

export const authRouter = Express.Router()
// técnicamente no hacemos el login habría que cambiar la ruta a /session por ejemplo
authRouter.post('/login', sessionCookieMiddleware, authController.getLoggedUserInfo)
authRouter.post('/googlelogin', sessionCookieMiddleware, authController.googleLogin)
authRouter.post('/register', sessionCookieMiddleware, authController.setLoggedUserInfo)
authRouter.post('/logout', sessionCookieMiddleware, authController.handleLogout)
authRouter.patch('/updateuser', checkUserSession, userController.editUserInfo)
authRouter.delete('/deleteuser', checkUserSession, userController.deleteUserInfo) // lo borra antes de que pase el middleware y no lo encuentra
