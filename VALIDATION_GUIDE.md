# Middleware de Validación con Zod

Este proyecto implementa un sistema de validación robusto usando Zod que proporciona:

## Características

- ✅ **Validación de tipos TypeScript** en tiempo de ejecución
- ✅ **Mensajes de error consistentes** y descriptivos
- ✅ **Validación de body, params, query y headers**
- ✅ **Middleware reutilizable** para todas las rutas
- ✅ **Esquemas centralizados** y mantenibles
- ✅ **Compatibilidad** con el código existente

## Uso Básico

### 1. Validar solo el body

```typescript
import { validateBody } from '../middlewares/validation/zodValidator'
import { createCategoryBodySchema } from '../middlewares/validation/validationSchemas'

router.post('/categories', 
  validateBody(createCategoryBodySchema),
  categoriesController.createCategory
)
```

### 2. Validar params

```typescript
import { validateParams } from '../middlewares/validation/zodValidator'
import { z } from 'zod'

const idParamsSchema = z.object({
  id: z.string().min(1, 'ID requerido')
})

router.get('/categories/:id',
  validateParams(idParamsSchema),
  categoriesController.getCategoryById
)
```

### 3. Validar query parameters

```typescript
import { validateQuery } from '../middlewares/validation/zodValidator'
import { paginationQuerySchema } from '../middlewares/validation/validationSchemas'

router.get('/links',
  validateQuery(paginationQuerySchema),
  linksController.getAllLinks
)
```

### 4. Validación múltiple

```typescript
import { validateRequest } from '../middlewares/validation/zodValidator'

router.patch('/links/:id',
  validateRequest({
    params: idParamsSchema,
    body: updateLinkSchema,
    query: paginationQuerySchema
  }),
  linksController.updateLink
)
```

## Esquemas Disponibles

### Categorías
- `createCategoryBodySchema` - Crear categoría
- `updateCategoryBodySchema` - Actualizar categoría
- `deleteCategoryBodySchema` - Eliminar categoría

### Links
- `createLinkBodySchema` - Crear link
- `updateLinkBodySchema` - Actualizar link
- `deleteLinkBodySchema` - Eliminar link

### Auth
- `loginBodySchema` - Login
- `registerBodySchema` - Registro
- `updateUserBodySchema` - Actualizar usuario

### Comunes
- `paginationQuerySchema` - Paginación
- `uploadImageBodySchema` - Subir imagen
- `deleteImageBodySchema` - Eliminar imagen

## Respuestas de Error

El middleware devuelve errores en formato consistente:

```json
{
  "status": "fail",
  "message": "Validation failed",
  "errors": [
    {
      "field": "body.name",
      "message": "El nombre es requerido",
      "code": "too_small"
    }
  ]
}
```

## Crear Nuevos Esquemas

1. **Definir el esquema** en `validationSchemas.ts`:

```typescript
export const myNewSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  email: z.string().email('Email inválido'),
  age: z.number().int().min(18, 'Debe ser mayor de edad')
})
```

2. **Usar en las rutas**:

```typescript
router.post('/my-endpoint',
  validateBody(myNewSchema),
  myController.myMethod
)
```

3. **En el controlador** (los datos ya están validados):

```typescript
static async myMethod(req: Request, res: Response) {
  // req.body ya contiene datos validados y con tipos correctos
  const { name, email, age } = req.body
  // No necesitas validar manualmente
}
```

## Beneficios vs Validación Manual

### Antes (validación manual):
```typescript
static async createCategory(req: Request, res: Response) {
  const validatedCol = validateCreateCategory(req.body)
  if (!validatedCol.success) {
    const errorsMessageArray = validatedCol.error?.issues.map(error => {
      return error.message
    })
    return res.status(400).json({ status: 'fail', message: errorsMessageArray })
  }
  const cleanData = validatedCol.data
  // ... resto del código
}
```

### Ahora (con middleware):
```typescript
static async createCategory(req: Request, res: Response) {
  // req.body ya está validado y limpio
  const category = await categoryModel.createCategory({ 
    user: req.user.name, 
    cleanData: req.body 
  })
  return res.status(201).json({ status: 'success', category })
}
```

## Notas de Migración

- ✅ **Compatibilidad**: Los controladores existentes siguen funcionando
- ✅ **Gradual**: Se puede migrar ruta por ruta
- ✅ **Mejoras**: Menos código repetitivo, mejor manejo de errores
- ✅ **Tipos**: TypeScript mejor integrado

## Manejo de Errores Global

El proyecto incluye un manejador de errores global que:

- 📝 **Registra errores** para debugging
- 🛡️ **Oculta detalles sensibles** en producción
- 📋 **Formato consistente** de respuestas de error
- 🔍 **Información de contexto** (URL, método, timestamp)
