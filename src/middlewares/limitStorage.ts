import { NextFunction, Response } from 'express'
import { userModel } from '../models/userModel'
import { RequestWithUser } from '../types/express'
import { constants } from '../utils/constants'

const limitStorage = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
  const userEmail = req.user?.email
  const file = req?.file
  console.log(req.path, req.method, 'limitStorage middleware called')

  if (userEmail === null || userEmail === '' || userEmail === undefined) {
    res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
    return
  }
  if (file === null || file === undefined) {
    if (req.path === '/icon' && req.method === 'POST') {
      next()
      return
    }
    res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: 'No hay archivo' })
    return
  }

  // Actualizar la cuota del usuario
  const userResult = await userModel.getUser({ email: userEmail })
  if ('error' in userResult) {
    res.status(404).json({ ...constants.API_FAIL_RESPONSE, error: 'Usuario no encontrado' })
    return
  }
  const quota = userResult.quota ?? 0
  const newQuota = quota + file.size

  // Solo actualizamos la cuota del usuario, sin limitar el almacenamiento
  await userModel.editUser({ email: userEmail, fields: { quota: newQuota } })
  next()
}

export default limitStorage
