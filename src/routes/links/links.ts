import Express from 'express'
import { linksController } from '../../controllers/linksController'
import { toRequestHandler } from '../../types/requestHandler'

const linksRouter = Express.Router()

// Rutas usando directamente los métodos del controlador
linksRouter.get('/', toRequestHandler(linksController.getAllLinks))
linksRouter.get('/:id', toRequestHandler(linksController.getLinkById))
linksRouter.post('/', toRequestHandler(linksController.createLink))
linksRouter.patch('/', toRequestHandler(linksController.updateLink))
linksRouter.delete('/', toRequestHandler(linksController.deleteLink))
linksRouter.get('/status', toRequestHandler(linksController.getLinkStatus))
linksRouter.get('/name', toRequestHandler(linksController.getLinkNameByUrl))

export { linksRouter }
