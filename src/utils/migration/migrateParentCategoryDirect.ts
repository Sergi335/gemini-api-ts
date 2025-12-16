import dotenv from 'dotenv'
import { MongoClient } from 'mongodb'

// Cargar variables de entorno
dotenv.config()

const DB_URI = process.env.DB_URI_TEST ?? ''

async function migrateParentCategoryDirect (): Promise<void> {
  if (DB_URI === '') {
    console.error('❌ DB_URI_TEST no está definida en las variables de entorno')
    process.exit(1)
  }

  console.log('🚀 Iniciando migración directa de parentCategory a parentId...')

  const client = new MongoClient(DB_URI)

  try {
    // Conectar a MongoDB
    await client.connect()
    console.log('✅ Conectado a MongoDB directamente')

    const db = client.db()
    const collection = db.collection('categories')

    // Buscar todas las categorías con parentCategory
    const categoriesWithParentCategory = await collection.find({
      parentCategory: { $exists: true, $nin: [null, ''] }
    }).toArray()

    console.log(`📊 Encontradas ${categoriesWithParentCategory.length} categorías con parentCategory`)

    if (categoriesWithParentCategory.length === 0) {
      console.log('✅ No hay categorías que migrar')
      return
    }

    // Mostrar algunas muestras
    console.log('\n📋 Primeras 3 categorías a migrar:')
    categoriesWithParentCategory.slice(0, 3).forEach((cat, index) => {
      console.log(`  ${index + 1}. ID: ${String(cat._id)}`)
      console.log(`     parentCategory: '${String(cat.parentCategory)}'`)
      console.log(`     name: '${String(cat.name)}'`)
      console.log('')
    })

    let migratedCount = 0
    let errorCount = 0

    // Procesar cada categoría
    for (const category of categoriesWithParentCategory) {
      try {
        console.log(`🔄 Procesando ${String(category._id)}: '${String(category.parentCategory)}' → parentId`)

        // Actualizar la categoría
        const result = await collection.updateOne(
          { _id: category._id },
          {
            $set: { parentId: category.parentCategory },
            $unset: { parentCategory: 1 }
          }
        )

        if (result.modifiedCount > 0) {
          migratedCount++
          console.log('   ✅ Migrada exitosamente')
        } else {
          errorCount++
          console.log(`   ❌ No se pudo modificar (matchedCount: ${result.matchedCount})`)
        }
      } catch (error) {
        errorCount++
        console.error(`   ❌ Error al procesar categoría ${String(category._id)}:`, error)
      }
    }

    console.log('\n📈 Resumen de migración:')
    console.log(`✅ Categorías migradas exitosamente: ${migratedCount}`)
    console.log(`❌ Errores: ${errorCount}`)
    console.log(`📊 Total procesadas: ${categoriesWithParentCategory.length}`)

    // Verificar el resultado
    console.log('\n🔍 Verificando migración...')
    const remainingWithParentCategory = await collection.countDocuments({
      parentCategory: { $exists: true, $nin: [null, ''] }
    })
    const withParentId = await collection.countDocuments({
      parentId: { $exists: true, $nin: [null, ''] }
    })

    console.log(`📊 Categorías con parentCategory restantes: ${remainingWithParentCategory}`)
    console.log(`📊 Categorías con parentId: ${withParentId}`)

    if (remainingWithParentCategory === 0 && migratedCount > 0) {
      console.log('🎉 ¡Migración completada exitosamente!')
    } else if (migratedCount === 0) {
      console.log('⚠️  No se migró ninguna categoría. Revisa los logs arriba.')
    } else {
      console.log('⚠️  Migración parcial. Algunas categorías no se pudieron migrar.')
    }
  } catch (error) {
    console.error('❌ Error durante la migración:', error)
    process.exit(1)
  } finally {
    await client.close()
    console.log('🔌 Conexión a la base de datos cerrada')
  }
}

// Ejecutar la migración
if (require.main === module) {
  migrateParentCategoryDirect()
    .then(() => {
      console.log('✅ Script de migración finalizado')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Error ejecutando el script:', error)
      process.exit(1)
    })
}

export { migrateParentCategoryDirect }
