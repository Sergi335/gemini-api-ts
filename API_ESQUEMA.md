# Esquema para replicar la API

---

## 1. Estructura de Carpetas

```
src/
  app.ts
  config/
    env.ts
    mongodb.ts
  controllers/
    authController.ts
    categoriesController.ts
    linksController.ts
    storageController.ts
  middlewares/
    cors.ts
    limitStorage.ts
    session.ts
  models/
    categoryModel.ts
    linkModel.ts
    userModel.ts
    schemas/
      categorySchema.ts
      linkSchema.ts
      userSchema.ts
  routes/
    auth/
      auth.ts
    categories/
      categories.ts
    links/
      links.ts
    storage/
      storage.ts
  types/
    express.d.ts
    categoryModel.types.ts
    linkModel.types.ts
  utils/
    linksUtils.ts
    ...
  validation/
    categoriesZodSchema.ts
    linksZodSchema.ts
```

---

## 2. Configuración

- Variables de entorno en `.env`:
  - `PORT`, `DB_URI`, `DB_URI_TEST`, `NODE_ENV`
  - Credenciales Firebase Admin y Client

- Conexión a MongoDB en `config/mongodb.ts`:
  - Función `dbConnect()` usando Mongoose.

---

## 3. Modelos (Mongoose)

### categorySchema.ts

```ts
const CategorySchema = new Schema({
  name: String,
  parentId: String,
  isEmpty: Boolean,
  order: Number,
  user: String,
  slug: { type: String, unique: true },
  hidden: { type: Boolean, default: false },
  displayName: String,
  level: { type: Number, default: 0 }
}, { timestamps: true, versionKey: false })
```

### linkSchema.ts

Campos principales: `name`, `description`, `URL`, `imgURL`, `categoryId`, `order`, `user`, `notes`, `images`, `bookmark`, `bookmarkOrder`, `readlist`.

### userSchema.ts

Campos principales: `name`, `realName`, `email`, `password`, `newUser`, `profileImage`, `signMethod`, `googleId`, `website`, `aboutMe`, `lastBackupUrl`, `quota`.

---

## 4. Rutas

### Auth

- `POST /auth/login`
- `POST /auth/googlelogin`
- `POST /auth/register`
- `POST /auth/logout`
- `PATCH /auth/updateuser`
- `DELETE /auth/deleteuser`

### Categorías

- `GET /categories`
- `POST /categories`
- `PATCH /categories`
- `DELETE /categories`

### Links

- `GET /links`
- `GET /links/getbyid/:id`
- `GET /links/desktop`
- `GET /links/count`
- `GET /links/getname`
- `GET /links/status`
- `GET /links/duplicates`
- `POST /links`
- `PATCH /links`
- `PATCH /links/move`
- `PATCH /links/setbookmarksorder`
- `DELETE /links`

### Storage

- `GET /storage/backgrounds`
- `GET /storage/backgroundurl`
- `GET /storage/icons`
- `GET /storage/backup`
- `POST /storage/backup`
- `POST /storage/restorebackup`
- `POST /storage/image`
- `POST /storage/icon`
- `POST /storage/profilepic`
- `DELETE /storage/image`
- `DELETE /storage/icon`

---

## 5. Controladores

- **authController**: login, registro, edición y borrado de usuario, gestión de sesión.
- **categoriesController**: CRUD de categorías, ordenación y jerarquía.
- **linksController**: CRUD de links, obtención por categoría, ordenación, duplicados.
- **storageController**: gestión de archivos e imágenes en Firebase Storage, backups.

---

## 6. Middlewares

- **cors.ts**: configuración de CORS.
- **limitStorage.ts**: límite de almacenamiento por usuario.
- **session.ts**: gestión de CSRF y sesión.

---

## 7. Validaciones

- Validación de datos con Zod en `validation/`.

---

## 8. Utilidades

- Funciones auxiliares en `utils/` (por ejemplo, para obtener nombre de links, comprobar estado de URLs, importar datos, etc).

---

## 9. Ejemplo de flujo de autenticación

1. El usuario inicia sesión con Google o email/password.
2. Se crea/verifica el usuario en MongoDB.
3. Se gestiona la sesión con cookies y Firebase.
4. El usuario puede acceder a sus categorías y links protegidos por middleware de sesión.

---

## 10. Cómo ejecutar

1. Instalar dependencias: `npm install`
2. Configurar `.env`
3. Ejecutar: `npm run dev` o `node src/app.ts`

---

## 11. Ejemplo de Endpoint

```http
GET /api/categories
Authorization: Bearer <token>
Response:
{
  "status": "success",
  "data": [
    { "_id": "cat1", "name": "Category 1", "user": "testuser" },
    ...
  ]
}
```

---

## 12. Notas

- Los endpoints protegidos requieren autenticación.
- La estructura de categorías es jerárquica (pueden tener parentId).
- Los links están asociados a categorías.
- El almacenamiento de archivos usa Firebase Storage.
- Validaciones con Zod.

---
