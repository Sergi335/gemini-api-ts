import Express from 'express'
import { categoriesController } from '../../controllers/categoriesController'
import {
  createCategoryBodySchema,
  deleteCategoryBodySchema,
  updateCategoryBodySchema
} from '../../middlewares/validation/validationSchemas'
import { validateBody } from '../../middlewares/validation/zodValidator'

const categoriesRouter = Express.Router()

// Rutas GET - no necesitan validación adicional (checkUserSession ya se aplica en app.ts)
categoriesRouter.get('/', categoriesController.getAllCategories)
categoriesRouter.get('/toplevel', categoriesController.getTopLevelCategories)
categoriesRouter.get('/:slug', categoriesController.getCategoriesByParentSlug)

// Rutas POST/PATCH/DELETE - solo necesitan validación de body
categoriesRouter.post('/',
  validateBody(createCategoryBodySchema),
  categoriesController.createCategory
)

categoriesRouter.patch('/',
  validateBody(updateCategoryBodySchema),
  categoriesController.updateCategory
)

categoriesRouter.delete('/',
  validateBody(deleteCategoryBodySchema),
  categoriesController.deleteCategory
)

export { categoriesRouter }
