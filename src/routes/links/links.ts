import Express from 'express'
import { linksController } from '../../controllers/linksController'

export const linksRouter = Express.Router()

linksRouter.get('/', linksController.getAllLinks)
linksRouter.get('/getbyid/:id', linksController.getLinkById)
linksRouter.get('/desktop', linksController.getAllLinksByCategory)
linksRouter.get('/count', linksController.getLinksCount)
linksRouter.get('/getname', linksController.getLinkNameByUrl)
linksRouter.get('/status', linksController.getLinkStatus)
linksRouter.get('/duplicates', linksController.findDuplicateLinks)

linksRouter.post('/', linksController.createLink)
linksRouter.patch('/', linksController.updateLink)
linksRouter.patch('/move', linksController.bulkMoveLinks)
linksRouter.patch('/setbookmarksorder', linksController.setBookMarksOrder)
linksRouter.delete('/', linksController.deleteLink)
