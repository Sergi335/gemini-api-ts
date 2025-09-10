import { Response } from 'express'
import { linkModel } from '../models/linkModel'
import { RequestWithUser } from '../types/express'
import { constants } from '../utils/constants'

/* eslint-disable @typescript-eslint/no-extraneous-class */
export class searchController {
  static async searchLinks (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      let query = req.query?.query
      const user = req.user?._id

      if (user === undefined || user === null || user === '') {
        return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
      }
      //   console.log(user)
      if (query !== null && query !== undefined) {
        query = String(query).trim()
        if (typeof query === 'string' && query.length < 2) {
          // Si la consulta tiene menos de tres letras, no se realiza la búsqueda
          return res.json([])
        }
        const regexQuery = new RegExp(`.*${query}.*`, 'i')
        const result = await linkModel.searchLinks({ user, query: regexQuery })
        return res.json(result)
      }
      // Si no se cumple ninguna condición anterior, devolver respuesta vacía
      return res.json([])
    } catch (error) {
      return res.status(500).json({ error: 'Error al buscar enlaces' })
    }
  }
}
