import Express from 'express'
import { linksController } from '../../controllers/linksController'

const linksRouter = Express.Router()

// Rutas usando directamente los métodos del controlador
linksRouter.get('/', linksController.getAllLinks)
linksRouter.get('/:id', linksController.getLinkById)
linksRouter.post('/', linksController.createLink)
linksRouter.patch('/', linksController.updateLink)
linksRouter.delete('/', linksController.deleteLink)
linksRouter.get('/status', linksController.getLinkStatus)
linksRouter.get('/name', linksController.getLinkNameByUrl)

export { linksRouter }
