import dotenv from 'dotenv'
import { MongoClient } from 'mongodb'

// Cargar variables de entorno
dotenv.config()

const DB_URI = process.env.DB_URI_TEST ?? ''

async function checkMigrationStatus (): Promise<void> {
  if (DB_URI === '') {
    console.error('❌ DB_URI_TEST no está definida en las variables de entorno')
    process.exit(1)
  }

  console.log('🔍 Verificando estado de la migración...')

  const client = new MongoClient(DB_URI)

  try {
    // Conectar a MongoDB
    await client.connect()
    console.log('✅ Conectado a MongoDB')

    const db = client.db()
    const collection = db.collection('categories')

    // Contar categorías totales
    const totalCategories = await collection.countDocuments({})
    console.log(`📊 Total de categorías: ${totalCategories}`)

    // Contar categorías con parentCategory (campo viejo)
    const withParentCategory = await collection.countDocuments({
      parentCategory: { $exists: true, $nin: [null, ''] }
    })

    // Contar categorías con parentId (campo nuevo)
    const withParentId = await collection.countDocuments({
      parentId: { $exists: true, $nin: [null, ''] }
    })

    // Contar categorías sin ningún campo padre
    const withoutParentFields = await collection.countDocuments({
      $and: [
        {
          $or: [
            { parentCategory: { $exists: false } },
            { parentCategory: null },
            { parentCategory: '' }
          ]
        },
        {
          $or: [
            { parentId: { $exists: false } },
            { parentId: null },
            { parentId: '' }
          ]
        }
      ]
    })

    console.log('\n📈 Estado actual:')
    console.log(`🔴 Categorías con parentCategory (campo viejo): ${withParentCategory}`)
    console.log(`🟢 Categorías con parentId (campo nuevo): ${withParentId}`)
    console.log(`⚪ Categorías sin campos padre: ${withoutParentFields}`)

    // Mostrar algunas muestras de categorías migradas
    if (withParentId > 0) {
      console.log('\n📋 Muestra de categorías migradas:')
      const sampleMigrated = await collection.find({
        parentId: { $exists: true, $nin: [null, ''] }
      }).limit(3).toArray()

      sampleMigrated.forEach((cat, index) => {
        console.log(`  ${index + 1}. ${String(cat.name)} (${String(cat._id)})`)
        console.log(`     parentId: '${String(cat.parentId)}'`)
        console.log(`     parentCategory: ${cat.parentCategory !== null && cat.parentCategory !== undefined && cat.parentCategory !== '' ? `'${String(cat.parentCategory)}'` : 'ELIMINADO ✅'}`)
        console.log('')
      })
    }

    // Evaluar el estado de la migración
    console.log('\n🎯 Evaluación:')
    if (withParentCategory === 0 && withParentId > 0) {
      console.log('🎉 ¡Migración COMPLETADA exitosamente!')
      console.log('✅ Todos los campos parentCategory han sido migrados a parentId')
      console.log('✅ No quedan campos parentCategory en la base de datos')
    } else if (withParentCategory > 0) {
      console.log('⚠️  Migración INCOMPLETA')
      console.log(`❌ Quedan ${withParentCategory} categorías con parentCategory sin migrar`)
    } else if (withParentId === 0) {
      console.log('❓ No se encontraron categorías con relaciones padre-hijo')
    }
  } catch (error) {
    console.error('❌ Error durante la verificación:', error)
    process.exit(1)
  } finally {
    await client.close()
    console.log('\n🔌 Conexión a la base de datos cerrada')
  }
}

// Ejecutar la verificación
if (require.main === module) {
  checkMigrationStatus()
    .then(() => {
      console.log('✅ Verificación finalizada')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Error ejecutando la verificación:', error)
      process.exit(1)
    })
}

export { checkMigrationStatus }
