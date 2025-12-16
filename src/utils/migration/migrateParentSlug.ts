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

async function migrateParentSlug (): Promise<void> {
  try {
    console.log('🚀 Iniciando migración de parentSlug...')

    // Conectar a la base de datos
    await connectToDatabase()
    console.log('✅ Conectado a la base de datos')

    // Análisis inicial de la estructura de datos
    console.log('\n🔍 Analizando estructura de datos...')

    const totalCategories = await categoryModel.countDocuments()
    console.log(`📊 Total de categorías: ${totalCategories}`)

    // Categorías nivel 0 (sin padre)
    const level0Categories = await categoryModel.countDocuments({
      $or: [
        { level: 0 },
        { parentId: null },
        { parentId: { $exists: false } }
      ]
    })

    // Categorías con nivel 1 y superior
    const childCategories = await categoryModel.countDocuments({
      level: { $gte: 1 },
      parentId: { $exists: true, $ne: null }
    })

    console.log(`📊 Categorías nivel 0 (raíz): ${level0Categories}`)
    console.log(`📊 Categorías con padre (level ≥ 1): ${childCategories}`)

    // Verificar que las categorías tienen la estructura esperada
    console.log('\n🔍 Muestra de categorías por nivel:')

    for (let level = 0; level <= 3; level++) {
      const sample = await categoryModel.find({ level }).limit(2).lean()
      if (sample.length > 0) {
        console.log(`\n📋 Nivel ${level}:`)
        sample.forEach((cat, index) => {
          console.log(`  ${index + 1}. ID: ${String(cat._id)} | Slug: ${cat.slug ?? 'undefined'} | ParentId: ${cat.parentId?.toString() ?? 'null'}`)
        })
      }
    }

    if (childCategories === 0) {
      console.log('✅ No hay categorías con padre para migrar')
      return
    }

    // Crear un mapa de ID -> slug para todas las categorías
    console.log('\n📝 Creando mapa de slugs...')
    const allCategories = await categoryModel.find({}, { _id: 1, slug: 1 }).lean()
    const slugMap = new Map<string, string>()

    allCategories.forEach(cat => {
      if (cat.slug !== null && cat.slug !== undefined && cat.slug !== '') {
        slugMap.set(String(cat._id), cat.slug)
      }
    })

    console.log(`📋 Mapa de slugs creado con ${slugMap.size} entradas`)

    // Obtener todas las categorías que necesitan parentSlug
    const categoriesToMigrate = await categoryModel.find({
      level: { $gte: 1 },
      parentId: { $exists: true, $ne: null },
      parentSlug: { $exists: false } // Solo las que no tienen parentSlug
    }).lean()

    console.log(`📊 Categorías a migrar: ${categoriesToMigrate.length}`)

    if (categoriesToMigrate.length === 0) {
      console.log('✅ Todas las categorías ya tienen parentSlug configurado')
      return
    }

    let migratedCount = 0
    let errorCount = 0
    let skippedCount = 0

    // Procesar cada categoría
    for (const category of categoriesToMigrate) {
      try {
        console.log(`\n🔄 Procesando categoría ${String(category._id)}:`)
        console.log(`   Slug: ${category.slug ?? 'undefined'}`)
        console.log(`   Level: ${category.level}`)
        console.log(`   ParentId: ${category.parentId?.toString() ?? 'null'}`)

        if (category.parentId === null || category.parentId === undefined || category.parentId.toString() === '') {
          console.log('   ⚠️  Sin parentId, saltando...')
          skippedCount++
          continue
        }

        // Buscar el slug del padre
        const parentSlug = slugMap.get(String(category.parentId))

        if (parentSlug === null || parentSlug === undefined || parentSlug === '') {
          console.log(`   ❌ No se encontró slug para el padre ${String(category.parentId)}`)
          errorCount++
          continue
        }

        console.log(`   ➡️  ParentSlug encontrado: "${parentSlug}"`)

        // Actualizar el documento
        const updateResult = await categoryModel.updateOne(
          { _id: category._id },
          { $set: { parentSlug } }
        )

        console.log('   📝 Resultado de actualización:')
        console.log(`      Documentos coincidentes: ${updateResult.matchedCount}`)
        console.log(`      Documentos modificados: ${updateResult.modifiedCount}`)

        if (updateResult.modifiedCount > 0) {
          migratedCount++
          console.log(`   ✅ Migrada: ${category.slug ?? 'undefined'} → parentSlug: "${parentSlug}"`)
        } else {
          console.log(`   ❌ No se pudo modificar la categoría ${String(category._id)}`)
          errorCount++
        }
      } catch (error) {
        errorCount++
        console.error(`   ❌ Error migrando categoría ${String(category._id)}:`, error)
      }
    }

    console.log('\n📈 Resumen de migración:')
    console.log(`✅ Categorías migradas exitosamente: ${migratedCount}`)
    console.log(`⏭️  Categorías saltadas: ${skippedCount}`)
    console.log(`❌ Errores: ${errorCount}`)
    console.log(`📊 Total procesadas: ${categoriesToMigrate.length}`)

    // Verificar la migración
    console.log('\n🔍 Verificando migración...')

    const withParentSlug = await categoryModel.countDocuments({
      parentSlug: { $exists: true }
    })

    const withoutParentSlug = await categoryModel.countDocuments({
      level: { $gte: 1 },
      parentId: { $exists: true, $ne: null },
      parentSlug: { $exists: false }
    })

    console.log(`📊 Categorías con parentSlug: ${withParentSlug}`)
    console.log(`📊 Categorías sin parentSlug (pero deberían tenerlo): ${withoutParentSlug}`)

    if (withoutParentSlug === 0 && migratedCount > 0) {
      console.log('🎉 ¡Migración completada exitosamente!')
    } else if (migratedCount === 0) {
      console.log('⚠️  No se migró ninguna categoría. Revisa los logs arriba.')
    } else {
      console.log('⚠️  Aún quedan categorías sin parentSlug')
    }
  } catch (error) {
    console.error('💥 Error durante la migración:', error)
    throw error
  } finally {
    await closeConnection()
    console.log('🔌 Conexión a la base de datos cerrada')
  }
}

// Función para verificar el estado actual
async function checkParentSlugStatus (): Promise<void> {
  try {
    console.log('🔍 Verificando estado actual de parentSlug...')

    await connectToDatabase()

    const totalCategories = await categoryModel.countDocuments()
    const level0Categories = await categoryModel.countDocuments({ level: 0 })
    const childCategories = await categoryModel.countDocuments({ level: { $gte: 1 } })
    const withParentSlug = await categoryModel.countDocuments({ parentSlug: { $exists: true } })
    const shouldHaveParentSlug = await categoryModel.countDocuments({
      level: { $gte: 1 },
      parentId: { $exists: true, $ne: null }
    })
    const missingParentSlug = await categoryModel.countDocuments({
      level: { $gte: 1 },
      parentId: { $exists: true, $ne: null },
      parentSlug: { $exists: false }
    })

    console.log('\n📊 Estado actual:')
    console.log(`📋 Total de categorías: ${totalCategories}`)
    console.log(`🔸 Categorías nivel 0: ${level0Categories}`)
    console.log(`🔹 Categorías con nivel ≥ 1: ${childCategories}`)
    console.log(`✅ Con parentSlug: ${withParentSlug}`)
    console.log(`📝 Deberían tener parentSlug: ${shouldHaveParentSlug}`)
    console.log(`❌ Falta parentSlug: ${missingParentSlug}`)

    if (missingParentSlug > 0) {
      console.log('\n⚠️  Se encontraron categorías sin parentSlug que deberían tenerlo')
      console.log('💡 Ejecuta la migración con: npm run migrate-parent-slug')

      // Mostrar algunas categorías problemáticas
      const problematicCategories = await categoryModel.find({
        level: { $gte: 1 },
        parentId: { $exists: true, $ne: null },
        parentSlug: { $exists: false }
      }).limit(5).lean()

      console.log('\n🔍 Ejemplos de categorías que necesitan migración:')
      problematicCategories.forEach((cat, index) => {
        console.log(`  ${index + 1}. ${cat.slug ?? 'undefined'} (Level: ${cat.level}, ParentId: ${cat.parentId?.toString() ?? 'null'})`)
      })
    } else {
      console.log('\n✅ Todas las categorías con padre tienen parentSlug configurado')
    }
  } catch (error) {
    console.error('💥 Error verificando estado:', error)
    throw error
  } finally {
    await closeConnection()
  }
}

// Función para rollback si es necesario
async function rollbackParentSlug (): Promise<void> {
  try {
    console.log('🔄 Iniciando rollback de parentSlug...')

    await connectToDatabase()

    const categoriesWithParentSlug = await categoryModel.countDocuments({
      parentSlug: { $exists: true }
    })

    console.log(`📊 Encontradas ${categoriesWithParentSlug} categorías con parentSlug`)

    if (categoriesWithParentSlug === 0) {
      console.log('✅ No hay categorías con parentSlug para revertir')
      return
    }

    const updateResult = await categoryModel.updateMany(
      { parentSlug: { $exists: true } },
      { $unset: { parentSlug: 1 } }
    )

    console.log(`🔄 Rollback completado. Categorías revertidas: ${updateResult.modifiedCount}`)
  } catch (error) {
    console.error('💥 Error durante el rollback:', error)
    throw error
  } finally {
    await closeConnection()
  }
}

// Función principal
async function main (): Promise<void> {
  const args = process.argv.slice(2)
  const isRollback = args.includes('--rollback')
  const isCheck = args.includes('--check')

  try {
    if (isCheck) {
      await checkParentSlugStatus()
    } else if (isRollback) {
      await rollbackParentSlug()
    } else {
      await migrateParentSlug()
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

export { checkParentSlugStatus, migrateParentSlug, rollbackParentSlug }
