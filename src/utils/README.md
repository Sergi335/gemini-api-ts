# Utils - Documentación de Estructura

Esta carpeta contiene utilidades organizadas en subcarpetas según su propósito.

## 📁 Estructura

```
utils/
├── conversion/      # Conversión y transformación de datos
├── data/            # Datos de ejemplo y backups
├── import/          # Importación de datos a MongoDB
├── migration/       # Migraciones de base de datos (solo datos existentes)
│   ├── checks/      # Verificación de estado de migraciones
│   └── rollback/    # Rollback de migraciones
├── r2/              # Utilidades de Cloudflare R2
├── constants.ts     # Constantes globales
├── linksUtils.ts    # Utilidades para manejo de links
└── linksUtils.test.ts
```

---

## 🚀 Flujo de Migración Recomendado

### Para datos nuevos (desde Firebase/backup)

El `dataConverter` ya genera los datos en formato completo con `parentId`, `parentSlug` y `slug`. **No necesitas migraciones adicionales.**

```bash
# 1. Colocar backup en data/
# 2. Convertir (genera parentId, parentSlug, slug automáticamente)
npm run convert-data

# 3. Importar a MongoDB
npm run import-data
```

### Para datos existentes en MongoDB (formato antiguo)

Solo si tienes datos en la base de datos con el formato antiguo:

```bash
# 1. Verificar estado
npm run check-migration-status
npm run migrate-parent-slug:check

# 2. Ejecutar migraciones si es necesario
npm run migrate-parent-category    # parentCategory → parentId
npm run migrate-parent-slug        # Añadir parentSlug
```

---

## 📂 conversion/

Herramientas para convertir datos de Firebase a formato MongoDB.

| Archivo | Descripción |
|---------|-------------|
| `dataConverter.ts` | Convertidor principal de datos Firebase → MongoDB |
| `dataConverter_clean.ts` | Versión limpia del convertidor sin dependencias externas |
| `convertData.ts` | Script ejecutable para realizar la conversión |
| `convertedData.json` | Datos convertidos listos para importar |
| `convertedData_sample.json` | Muestra de datos convertidos para pruebas |
| `README_conversion.md` | Documentación del proceso de conversión |

---

## 📂 data/

Archivos de datos de ejemplo y backups para desarrollo/testing.

| Archivo | Descripción |
|---------|-------------|
| `dummyData.json` | Datos ficticios para pruebas |
| `example_data_format.json` | Formato de ejemplo de estructura de datos |
| `sergiadn335@gmail.comdataBackup.json` | Backup de datos de usuario |

---

## 📂 import/

Scripts para importar datos convertidos a MongoDB.

| Archivo | Descripción |
|---------|-------------|
| `dataImporter.ts` | Importador de datos a MongoDB |
| `createSample.ts` | Genera datos de muestra para testing |

---

## 📂 migration/

Scripts de migración de base de datos.

| Archivo | Descripción |
|---------|-------------|
| `migrateParentCategory.ts` | Migración de categorías padre |
| `migrateParentCategoryDirect.ts` | Migración directa de categorías padre |
| `migrateParentSlug.ts` | Migración de slugs de categorías padre |
| `newMigrationsWithoutId.js` | Nuevas migraciones sin IDs |
| `README_migration.md` | Documentación del proceso de migración |

### 📂 migration/checks/

Verificación del estado de las migraciones.

| Archivo | Descripción |
|---------|-------------|
| `checkMigrationStatus.ts` | Verifica el estado general de migraciones |
| `checkParentSlugStatus.ts` | Verifica el estado de migración de parent slugs |

### 📂 migration/rollback/

Scripts para revertir migraciones.

| Archivo | Descripción |
|---------|-------------|
| `rollbackParentSlug.ts` | Revierte la migración de parent slugs |

---

## 📂 r2/

Utilidades para Cloudflare R2 (almacenamiento S3-compatible).

| Archivo | Descripción |
|---------|-------------|
| `listR2Buckets.js` | Lista todos los buckets en la cuenta R2 |

---

## 📄 Archivos Raíz

| Archivo | Descripción |
|---------|-------------|
| `constants.ts` | Constantes globales de la aplicación |
| `linksUtils.ts` | Funciones auxiliares para manejo de links (queries, URLs, etc.) |
| `linksUtils.test.ts` | Tests para linksUtils |

---

## 🚀 Uso Común

### Convertir e importar datos de Firebase
```bash
# 1. Colocar backup en: src/utils/data/sergiadn335@gmail.comdataBackup.json

# 2. Convertir (genera parentId, parentSlug, slug)
npm run convert-data

# 3. Importar a MongoDB
npm run import-data                    # Omite duplicados
npm run import-data-overwrite          # Sobrescribe todo
```

### Migraciones (solo para datos existentes en formato antiguo)
```bash
# Verificar estado
npm run check-migration-status
npm run migrate-parent-slug:check

# Ejecutar si es necesario
npm run migrate-parent-category
npm run migrate-parent-slug

# Rollback si algo falla
npm run rollback-parent-category
npm run migrate-parent-slug:rollback
```

### Listar buckets de R2
```bash
node src/utils/r2/listR2Buckets.js
```
