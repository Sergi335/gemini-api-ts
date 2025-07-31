import Express from 'express'
import { categoriesController } from '../../controllers/categoriesController'

const categoriesRouter = Express.Router()

// Ahora podemos usar directamente los métodos del controlador
categoriesRouter.get('/', categoriesController.getAllCategories)
categoriesRouter.get('/toplevel', categoriesController.getTopLevelCategories)
// categoriesRouter.get('/getbydesk/:desktop', categoriesController.getColumnByDesktop)
// categoriesRouter.get('/count', categoriesController.getColumnCount)

categoriesRouter.post('/', categoriesController.createCategory)
categoriesRouter.patch('/', categoriesController.updateCategory)
categoriesRouter.delete('/', categoriesController.deleteCategory)

export { categoriesRouter }
