import Express from 'express'
import { categoriesController } from '../../controllers/categoriesController'
import { toRequestHandler } from '../../types/requestHandler'

const categoriesRouter = Express.Router()

// Ahora podemos usar directamente los métodos del controlador
categoriesRouter.get('/', toRequestHandler(categoriesController.getAllCategories))
// categoriesRouter.get('/getbydesk/:desktop', categoriesController.getColumnByDesktop)
// categoriesRouter.get('/count', categoriesController.getColumnCount)

categoriesRouter.post('/', toRequestHandler(categoriesController.createCategory))
categoriesRouter.patch('/', toRequestHandler(categoriesController.updateCategory))
categoriesRouter.delete('/', toRequestHandler(categoriesController.deleteCategory))

export { categoriesRouter }
