import Express from 'express'
import { z } from 'zod'
import { linksController } from '../../controllers/linksController'
import {
  createLinkBodySchema,
  deleteLinkBodySchema,
  paginationQuerySchema,
  updateLinkBodySchema
} from '../../middlewares/validation/validationSchemas'
import { validateBody, validateParams, validateQuery } from '../../middlewares/validation/zodValidator'

export const linksRouter = Express.Router()

// Esquemas para params
const linkIdParamsSchema = z.object({
  id: z.string().min(1, 'ID de link requerido')
})

// Rutas GET
linksRouter.get('/', linksController.getAllLinks)
linksRouter.get('/getbyid/:id',
  validateParams(linkIdParamsSchema),
  linksController.getLinkById
)
linksRouter.get('/desktop',
  validateQuery(paginationQuerySchema),
  linksController.getAllLinksByCategory
)
linksRouter.get('/count',
  validateQuery(paginationQuerySchema),
  linksController.getLinksCount
)
linksRouter.get('/getname',
  validateQuery(z.object({ url: z.string().url('URL inválida') })),
  linksController.getLinkNameByUrl
)
linksRouter.get('/status',
  validateQuery(z.object({ url: z.string().url('URL inválida') })),
  linksController.getLinkStatus
)
linksRouter.get('/duplicates', linksController.findDuplicateLinks)

// Rutas POST/PATCH/DELETE
linksRouter.post('/',
  validateBody(createLinkBodySchema),
  linksController.createLink
)
linksRouter.patch('/',
  validateBody(updateLinkBodySchema),
  linksController.updateLink
)
linksRouter.patch('/move',
  validateBody(z.object({
    sourceCategoryId: z.string().min(1),
    destinyCategoryId: z.string().min(1),
    links: z.array(z.string())
  })),
  linksController.bulkMoveLinks
)
linksRouter.patch('/setbookmarksorder',
  validateBody(z.object({
    links: z.array(z.string())
  })),
  linksController.setBookMarksOrder
)
linksRouter.delete('/',
  validateBody(deleteLinkBodySchema),
  linksController.deleteLink
)
