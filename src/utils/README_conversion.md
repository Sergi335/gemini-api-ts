# Sistema de Conversión de Datos

Este sistema permite convertir datos de bookmarks/enlaces del formato antiguo al nuevo formato jerárquico con categorías padre-hijo.

## 🎯 Objetivo

Transformar estructuras de datos antiguas donde los "escritorios" eran categorías de nivel superior, al nuevo formato jerárquico donde:
- Los escritorios se convierten en **categorías padre** (nivel 0)
- Las categorías originales se convierten en **subcategorías** (nivel 1)
- Los links mantienen sus propiedades pero se asocian a las nuevas categorías

## 📁 Archivos

- `dataConverter.ts` - Clase principal de conversión
- `convertData.ts` - Script de ejecución
- `example_data_format.json` - Ejemplos de formatos soportados

## 🚀 Uso Rápido

1. **Preparar datos**: Coloca tus datos en `sergiadn335@gmail.comdataBackup.json`
2. **Ejecutar conversión**: `npm run convert-data`
3. **Revisar resultado**: Verifica `convertedData.json`
4. **Importar a BD**: `npm run import-data` (o `npm run import-data-overwrite` para sobrescribir)

## 📝 Scripts Disponibles

- `npm run convert-data` - Convierte datos del formato antiguo al nuevo
- `npm run import-data` - Importa datos a MongoDB (omite existentes)
- `npm run import-data-overwrite` - Importa datos sobrescribiendo todo

## 📝 Formatos Soportados

### Formato Escritorios
```json
{
  "escritorios": [
    {
      "name": "Desarrollo",
      "categories": [
        {
          "name": "Frameworks",
          "links": [...]
        }
      ]
    }
  ]
}
```

### Formato Plano
```json
{
  "categories": [
    {
      "name": "Programación",
      "desktop": "Trabajo"
    }
  ],
  "links": [
    {
      "name": "GitHub",
      "category": "programacion_id"
    }
  ]
}
```

## 🔄 Proceso de Conversión

1. **Detección automática** del formato de entrada
2. **Escritorios → Categorías padre** (nivel 0)
3. **Categorías → Subcategorías** (nivel 1)
4. **Preservación** de todas las propiedades de links
5. **Generación** de IDs únicos para nuevas entidades

## 📊 Resultado

El archivo convertido tendrá la estructura:
```json
{
  "categories": [
    {
      "_id": "generated_id",
      "name": "Escritorio Original",
      "level": 0,
      "order": 0,
      "user": "SergioSR"
    },
    {
      "_id": "generated_id_2",
      "name": "Categoria Original", 
      "parentCategory": "generated_id",
      "level": 1,
      "order": 0,
      "user": "SergioSR"
    }
  ],
  "links": [...]
}
```

## ⚙️ Configuración Avanzada

```typescript
import { DataConverter } from './dataConverter'

const converter = new DataConverter('tu_usuario')
await converter.convertFile('input.json', 'output.json')
```

## 🛡️ Validaciones

- ✅ Preserva todos los links existentes
- ✅ Mantiene el orden original
- ✅ Genera IDs únicos para evitar conflictos
- ✅ Maneja datos faltantes con valores por defecto
- ✅ Valida la integridad de las relaciones

## 📋 Checklist Post-Conversión

- [ ] Revisar número de categorías generadas
- [ ] Verificar estructura jerárquica
- [ ] Confirmar que todos los links tienen categoria válida
- [ ] **Importar datos**: `npm run import-data`
- [ ] **Validar importación** en MongoDB
- [ ] Ejecutar tests de integridad

## 🗄️ Importación a Base de Datos

### Importación Normal (Preserva datos existentes)
```bash
npm run import-data
```

### Importación con Sobrescritura (Limpia todo)
```bash
npm run import-data-overwrite
```

### Variables de Entorno
- `MONGODB_URI` - URI de conexión a MongoDB (default: `mongodb://localhost:27017/justlinks`)

### Validaciones Automáticas
- ✅ Cuenta total de documentos insertados
- ✅ Verifica integridad categría-link
- ✅ Detecta links huérfanos
- ✅ Muestra estadísticas detalladas

## 🚨 Importante

- Los archivos `*dataBackup.json` están en `.gitignore`
- Siempre haz backup de tus datos originales
- Verifica la conversión antes de importar a producción
