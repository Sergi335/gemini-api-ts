# Migración de parentCategory a parentId

Este script migra el campo `parentCategory` a `parentId` en todas las categorías de la base de datos para mantener consistencia con el esquema actualizado.

## 🔧 Comandos Disponibles

### 1. Verificar Estado Actual
```bash
npm run check-migration-status
```
Muestra el estado actual de la base de datos sin hacer cambios.

### 2. Ejecutar Migración
```bash
npm run migrate-parent-category
```
Ejecuta la migración completa:
- Busca todas las categorías con campo `parentCategory`
- Copia el valor a `parentId`
- Elimina el campo `parentCategory`
- Muestra un resumen detallado

### 3. Rollback (Revertir)
```bash
npm run rollback-parent-category
```
Revierte la migración si algo sale mal:
- Busca todas las categorías con campo `parentId`
- Copia el valor a `parentCategory`
- Elimina el campo `parentId`

## 📋 Proceso de Migración Recomendado

1. **Verificar estado actual**:
   ```bash
   npm run check-migration-status
   ```

2. **Hacer backup de la base de datos** (recomendado):
   ```bash
   # Ejemplo con mongodump
   mongodump --uri="tu_mongodb_uri" --out=backup_antes_migracion
   ```

3. **Ejecutar migración**:
   ```bash
   npm run migrate-parent-category
   ```

4. **Verificar que todo funciona correctamente**:
   - Probar la aplicación
   - Verificar que las categorías padre-hijo funcionan

5. **Si algo sale mal, hacer rollback**:
   ```bash
   npm run rollback-parent-category
   ```

## 🔍 Variables de Entorno

El script usa la variable `DB_URI_TEST` del archivo `.env` para conectarse a la base de datos.

## 📊 Ejemplo de Salida

```
🚀 Iniciando migración de parentCategory a parentId...
📦 Conectado a MongoDB (TEST)
✅ Conectado a la base de datos
📊 Encontradas 15 categorías con campo parentCategory

✅ Migrada categoría 60f1b2c3d4e5f6789abcdef0: parentCategory="parent123" → parentId="parent123"
✅ Migrada categoría 60f1b2c3d4e5f6789abcdef1: parentCategory="parent456" → parentId="parent456"
...

📈 Resumen de migración:
✅ Categorías migradas exitosamente: 15
❌ Errores: 0
📊 Total procesadas: 15

🔍 Verificando migración...
📊 Categorías con parentCategory restantes: 0
📊 Categorías con parentId: 15
🎉 ¡Migración completada exitosamente!
🔌 Conexión a la base de datos cerrada
```

## ⚠️ Advertencias

- **Siempre haz backup** antes de ejecutar la migración
- El script está diseñado para ser **idempotente** (se puede ejecutar múltiples veces sin problemas)
- Usa la base de datos de **TEST** (DB_URI_TEST) por seguridad
- Si encuentras errores, revisa los logs y considera hacer rollback

## 🔧 Desarrollo

Si necesitas modificar el script, está ubicado en:
```
src/utils/migrateParentCategory.ts
```

El script incluye:
- ✅ Manejo de errores robusto
- ✅ Logging detallado
- ✅ Validaciones de seguridad
- ✅ Verificación post-migración
- ✅ Capacidad de rollback
- ✅ Estadísticas completas
