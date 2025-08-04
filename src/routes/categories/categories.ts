import Express from 'express'
import { categoriesController } from '../../controllers/categoriesController'
import {
  createCategoryBodySchema,
  deleteCategoryBodySchema,
  nestingCategoriesBodySchema,
  reorderingCategoriesBodySchema,
  updateCategoryBodySchema
} from '../../middlewares/validation/validationSchemas'
import { validateBody } from '../../middlewares/validation/zodValidator'

const categoriesRouter = Express.Router()

// Rutas GET - no necesitan validación adicional (checkUserSession ya se aplica en app.ts)
categoriesRouter.get('/', categoriesController.getAllCategories)
categoriesRouter.get('/toplevel', categoriesController.getTopLevelCategories)

// Rutas POST/PATCH/DELETE - solo necesitan validación de body
categoriesRouter.post('/',
  validateBody(createCategoryBodySchema),
  categoriesController.createCategory
)
categoriesRouter.post('/nest',
  validateBody(nestingCategoriesBodySchema),
  categoriesController.updateNestingCategories
)
categoriesRouter.post('/reorder',
  validateBody(reorderingCategoriesBodySchema),
  categoriesController.updateReorderingCategories
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
