import dotenv from 'dotenv'
import { connect, disconnect } from 'mongoose'
import categoryModel from '../models/schemas/categorySchema'

// Cargar variables de entorno una sola vez
dotenv.config()

async function connectToDatabase (): Promise<void> {
  try {
    const dbUri = process.env.DB_URI_TEST
    if (typeof dbUri !== 'string' || dbUri.trim() === '') {
      throw new Error('DB_URI_TEST no está definido en las variables de entorno')
    }
    await connect(dbUri)
    console.log('📦 Conectado a MongoDB (TEST)')
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error)
    throw error
  }
}

async function closeConnection (): Promise<void> {
  try {
    await disconnect()
    console.log('🔌 Desconectado de MongoDB')
  } catch (error) {
    console.error('❌ Error desconectando de MongoDB:', error)
    throw error
  }
}

async function migrateParentCategoryToParentId (): Promise<void> {
  try {
    console.log('🚀 Iniciando migración de parentCategory a parentId...')

    // Conectar a la base de datos
    await connectToDatabase()
    console.log('✅ Conectado a la base de datos')

    // Primero, vamos a ver una muestra de documentos para entender la estructura
    console.log('\n🔍 Analizando estructura de datos...')
    const sampleCategories = await categoryModel.find({}).limit(5).lean()
    console.log('📋 Muestra de categorías encontradas:')
    sampleCategories.forEach((cat, index) => {
      console.log(`  ${index + 1}. ID: ${String(cat._id)}`)
      console.log(`     Campos: ${Object.keys(cat).join(', ')}`)
      if ('parentCategory' in cat) {
        console.log(`     parentCategory: ${String((cat as any).parentCategory)}`)
      }
      if ('parentId' in cat) {
        console.log(`     parentId: ${String(cat.parentId ?? 'undefined')}`)
      }
      console.log('')
    })

    // Buscar todas las categorías que tienen el campo parentCategory
    const categoriesWithParentCategory = await categoryModel.find({
      parentCategory: { $exists: true }
    }).lean()

    console.log(`📊 Encontradas ${categoriesWithParentCategory.length} categorías con campo parentCategory`)

    // También buscar por otros posibles nombres de campo
    const alternativeFields = await categoryModel.find({
      $or: [
        { parent: { $exists: true } },
        { parentCategoryId: { $exists: true } },
        { parent_id: { $exists: true } }
      ]
    }).lean()

    if (alternativeFields.length > 0) {
      console.log(`🔍 Encontradas ${alternativeFields.length} categorías con campos padre alternativos:`)
      alternativeFields.forEach((cat, index) => {
        console.log(`  ${index + 1}. ID: ${String(cat._id)}`)
        const catAny = cat as any
        if (typeof catAny.parent === 'string') console.log(`     parent: ${String(catAny.parent)}`)
        if (typeof catAny.parentCategoryId === 'string') console.log(`     parentCategoryId: ${String(catAny.parentCategoryId)}`)
        if (typeof catAny.parent_id === 'string') console.log(`     parent_id: ${String(catAny.parent_id)}`)
      })
    }

    if (categoriesWithParentCategory.length === 0) {
      console.log('✅ No hay categorías que migrar con campo parentCategory')
      console.log('💡 Verifica que el campo se llame exactamente "parentCategory"')
      return
    }

    let migratedCount = 0
    let errorCount = 0
    let skippedCount = 0

    // Procesar cada categoría
    for (const category of categoriesWithParentCategory) {
      try {
        const categoryAny = category as any
        console.log(`\n🔄 Procesando categoría ${String(category._id)}:`)
        console.log(`   parentCategory actual: ${String(categoryAny.parentCategory)}`)
        console.log(`   parentId actual: ${String(category.parentId ?? 'undefined')}`)

        const updateData: any = {}

        // Si existe parentCategory, copiarlo a parentId
        if (typeof categoryAny.parentCategory === 'string' && categoryAny.parentCategory.trim() !== '') {
          updateData.parentId = categoryAny.parentCategory
          console.log(`   ➡️  Copiando "${String(categoryAny.parentCategory)}" a parentId`)
        } else {
          console.log('   ⚠️  parentCategory está vacío o no es string, saltando...')
          skippedCount++
          continue
        }

        // Actualizar el documento
        const updateResult = await categoryModel.updateOne(
          { _id: category._id },
          {
            $set: updateData,
            $unset: { parentCategory: 1 } // Eliminar el campo parentCategory
          }
        )

        console.log('   📝 Resultado de actualización:')
        console.log(`      Documentos coincidentes: ${updateResult.matchedCount}`)
        console.log(`      Documentos modificados: ${updateResult.modifiedCount}`)

        if (updateResult.modifiedCount > 0) {
          migratedCount++
          const parentValue = String(categoryAny.parentCategory ?? 'null')
          const categoryId = String(category._id)
          console.log(`   ✅ Migrada categoría ${categoryId}: parentCategory="${parentValue}" → parentId="${parentValue}"`)
        } else {
          console.log(`   ❌ No se pudo modificar la categoría ${String(category._id)}`)
          errorCount++
        }
      } catch (error) {
        errorCount++
        const categoryId = String(category._id)
        console.error(`   ❌ Error migrando categoría ${categoryId}:`, error)
      }
    }

    console.log('\n📈 Resumen de migración:')
    console.log(`✅ Categorías migradas exitosamente: ${migratedCount}`)
    console.log(`⏭️  Categorías saltadas (vacías): ${skippedCount}`)
    console.log(`❌ Errores: ${errorCount}`)
    console.log(`📊 Total procesadas: ${categoriesWithParentCategory.length}`)

    // Verificar la migración
    console.log('\n🔍 Verificando migración...')
    const remainingOldFields = await categoryModel.countDocuments({
      parentCategory: { $exists: true }
    })

    const newFieldsCount = await categoryModel.countDocuments({
      parentId: { $exists: true }
    })

    console.log(`📊 Categorías con parentCategory restantes: ${remainingOldFields}`)
    console.log(`📊 Categorías con parentId: ${newFieldsCount}`)

    if (remainingOldFields === 0 && migratedCount > 0) {
      console.log('🎉 ¡Migración completada exitosamente!')
    } else if (migratedCount === 0) {
      console.log('⚠️  No se migró ninguna categoría. Revisa los logs arriba.')
    } else {
      console.log('⚠️  Aún quedan categorías con el campo antiguo')
    }
  } catch (error) {
    console.error('💥 Error durante la migración:', error)
    throw error
  } finally {
    // Cerrar conexión
    await closeConnection()
    console.log('🔌 Conexión a la base de datos cerrada')
  }
}

// Función para hacer rollback si es necesario
async function rollbackMigration (): Promise<void> {
  try {
    console.log('🔄 Iniciando rollback de migración...')

    await connectToDatabase()
    console.log('✅ Conectado a la base de datos')

    // Buscar todas las categorías que tienen parentId
    const categoriesWithParentId = await categoryModel.find({
      parentId: { $exists: true }
    }).lean()

    console.log(`📊 Encontradas ${categoriesWithParentId.length} categorías con campo parentId`)

    let rolledBackCount = 0

    for (const category of categoriesWithParentId) {
      try {
        const updateData: any = {}

        if (typeof category.parentId === 'string' && category.parentId.trim() !== '') {
          updateData.parentCategory = category.parentId
        }

        await categoryModel.updateOne(
          { _id: category._id },
          {
            $set: updateData,
            $unset: { parentId: 1 }
          }
        )

        rolledBackCount++
        const parentValue = String(category.parentId ?? 'null')
        const categoryId = String(category._id)
        console.log(`✅ Rollback categoría ${categoryId}: parentId="${parentValue}" → parentCategory="${parentValue}"`)
      } catch (error) {
        const categoryId = String(category._id)
        console.error(`❌ Error en rollback categoría ${categoryId}:`, error)
      }
    }

    console.log(`🔄 Rollback completado. Categorías revertidas: ${rolledBackCount}`)
  } catch (error) {
    console.error('💥 Error durante el rollback:', error)
    throw error
  } finally {
    await closeConnection()
    console.log('🔌 Conexión cerrada')
  }
}

// Función para mostrar el estado actual de la base de datos
async function checkMigrationStatus (): Promise<void> {
  try {
    console.log('🔍 Verificando estado actual de la base de datos...')

    await connectToDatabase()

    const totalCategories = await categoryModel.countDocuments()
    const withParentCategory = await categoryModel.countDocuments({
      parentCategory: { $exists: true }
    })
    const withParentId = await categoryModel.countDocuments({
      parentId: { $exists: true }
    })

    console.log('\n📊 Estado actual:')
    console.log(`📋 Total de categorías: ${totalCategories}`)
    console.log(`🔸 Con campo parentCategory: ${withParentCategory}`)
    console.log(`🔹 Con campo parentId: ${withParentId}`)

    if (withParentCategory > 0) {
      console.log('\n⚠️  Se encontraron categorías con el campo parentCategory antiguo')
      console.log('💡 Ejecuta la migración con: npm run migrate-parent-category')
    } else if (withParentId > 0) {
      console.log('\n✅ Todas las categorías están usando el campo parentId correcto')
    } else {
      console.log('\n📝 No se encontraron categorías con campos padre')
    }
  } catch (error) {
    console.error('💥 Error verificando estado:', error)
    throw error
  } finally {
    await closeConnection()
  }
}

// Ejecutar migración
async function main (): Promise<void> {
  const args = process.argv.slice(2)
  const isRollback = args.includes('--rollback')
  const isCheck = args.includes('--check')

  try {
    if (isCheck) {
      await checkMigrationStatus()
    } else if (isRollback) {
      await rollbackMigration()
    } else {
      await migrateParentCategoryToParentId()
    }
  } catch (error) {
    console.error('💥 Error en la ejecución:', error)
    process.exit(1)
  }
}

// Solo ejecutar si es llamado directamente
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Error fatal:', error)
    process.exit(1)
  })
}

export { checkMigrationStatus, migrateParentCategoryToParentId, rollbackMigration }
