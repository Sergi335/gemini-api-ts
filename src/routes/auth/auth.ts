import Express from 'express'
import { sessionCookieMiddleware, checkUserSession, usersController } from '../../controllers/authController'

export const authRouter = Express.Router()
// técnicamente no hacemos el login habría que cambiar la ruta a /session por ejemplo
authRouter.post('/login', sessionCookieMiddleware, usersController.getLoggedUserInfo)
authRouter.post('/googlelogin', sessionCookieMiddleware, usersController.googleLogin)
authRouter.post('/register', sessionCookieMiddleware, usersController.setLoggedUserInfo)
authRouter.post('/logout', sessionCookieMiddleware, usersController.handleLogout)
authRouter.patch('/updateuser', checkUserSession, usersController.editUserInfo)
authRouter.delete('/deleteuser', checkUserSession, usersController.deleteUserInfo) // lo borra antes de que pase el middleware y no lo encuentra
