import Express from 'express'

import { z } from 'zod'
import { searchController } from '../../controllers/searchController'
import { validateQuery } from '../../middlewares/validation/zodValidator'

export const searchRouter = Express.Router()

searchRouter.get('/',
  validateQuery(z.object({ query: z.string().min(1).max(100).optional() })),
  searchController.searchLinks
)
