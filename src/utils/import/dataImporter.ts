/**
 * Script para importar los datos convertidos a la base de datos MongoDB
 *
 * Este script toma el archivo convertedData.json y lo importa directamente
 * a las colecciones de categorías y links en MongoDB
 */
import 'dotenv/config'
import fs from 'fs'
import { Db, MongoClient, ObjectId } from 'mongodb'
import path from 'path'

// URI de conexión directa a la base de datos de desarrollo
const DB_URI_TEST = process.env.DB_URI_TEST ?? 'mongodb+srv://sergiadn335:'

// ID del usuario al que se asignarán los datos
const TARGET_USER_ID = '6892646cea856ea73ab59125'

interface ImportData {
  categories: any[]
  links: any[]
}

interface ImportStats {
  categoriesInserted: number
  linksInserted: number
  categoriesDeleted: number
  linksDeleted: number
  errors: string[]
}

export class DataImporter {
  private db: Db | null = null
  private client: MongoClient | null = null

  /**
   * Conecta a la base de datos MongoDB de desarrollo
   */
  async connect (): Promise<void> {
    const uri = DB_URI_TEST
    const dbName = process.env.DB_NAME ?? 'test'

    console.log('🔍 Conectando a:', dbName)

    try {
      const cleanUri = uri.replace(/^"|"$/g, '')
      this.client = new MongoClient(cleanUri)
      await this.client.connect()
      this.db = this.client.db(dbName)
      console.log(`✅ Conectado a MongoDB: ${dbName}`)
    } catch (error) {
      console.error('❌ Error conectando a MongoDB:', error)
      throw error
    }
  }

  /**
   * Cierra la conexión a la base de datos
   */
  async disconnect (): Promise<void> {
    if (this.client != null) {
      await this.client.close()
      console.log('🔌 Conexión a MongoDB cerrada')
    }
  }

  /**
   * Elimina todos los datos del usuario especificado
   */
  async clearUserData (userId: ObjectId): Promise<{ categoriesDeleted: number, linksDeleted: number }> {
    if (this.db == null) {
      throw new Error('❌ No hay conexión a la base de datos')
    }

    console.log(`🧹 Eliminando datos existentes del usuario: ${userId.toString()}`)

    const categoriesCollection = this.db.collection('categories')
    const linksCollection = this.db.collection('links')

    // Eliminar categorías del usuario
    const categoriesResult = await categoriesCollection.deleteMany({ user: userId })
    console.log(`   📁 Categorías eliminadas: ${categoriesResult.deletedCount}`)

    // Eliminar links del usuario
    const linksResult = await linksCollection.deleteMany({ user: userId })
    console.log(`   🔗 Links eliminados: ${linksResult.deletedCount}`)

    return {
      categoriesDeleted: categoriesResult.deletedCount,
      linksDeleted: linksResult.deletedCount
    }
  }

  /**
   * Importa los datos convertidos a las colecciones
   */
  async importData (dataPath: string): Promise<ImportStats> {
    if (this.db == null) {
      throw new Error('❌ No hay conexión a la base de datos. Llama a connect() primero.')
    }

    const userId = new ObjectId(TARGET_USER_ID)

    const stats: ImportStats = {
      categoriesInserted: 0,
      linksInserted: 0,
      categoriesDeleted: 0,
      linksDeleted: 0,
      errors: []
    }

    try {
      // Leer el archivo de datos convertidos
      const rawData = fs.readFileSync(dataPath, 'utf8')
      const data: ImportData = JSON.parse(rawData)

      console.log('📊 Datos cargados desde:', dataPath)
      console.log('   📁 Categorías a importar:', data.categories.length)
      console.log('   🔗 Links a importar:', data.links.length)
      console.log(`   👤 Usuario destino: ${TARGET_USER_ID}`)
      console.log('')

      // 1. Primero eliminar todos los datos existentes del usuario
      const deleteStats = await this.clearUserData(userId)
      stats.categoriesDeleted = deleteStats.categoriesDeleted
      stats.linksDeleted = deleteStats.linksDeleted

      // Obtener referencias a las colecciones
      const categoriesCollection = this.db.collection('categories')
      const linksCollection = this.db.collection('links')

      // Mapa para relacionar _id antiguos con nuevos
      const categoryIdMap = new Map<string, ObjectId>()

      // 2. Importar categorías con el userId correcto
      console.log('')
      console.log('📁 Importando categorías...')
      for (const category of data.categories) {
        try {
          // Guardar el _id antiguo para mapear
          const oldId = category._id

          // Generar nuevo ObjectId
          const newId = new ObjectId()

          // Guardar relación antiguo -> nuevo
          categoryIdMap.set(oldId, newId)

          // Crear documento con el userId como ObjectId y nuevo _id
          const categoryDoc = {
            ...category,
            _id: newId,
            user: userId,
            // parentId se resuelve después
            parentId: null
          }

          // Eliminar campos que no necesitamos
          delete categoryDoc.userName

          await categoriesCollection.insertOne(categoryDoc)
          stats.categoriesInserted++

          if (stats.categoriesInserted % 50 === 0) {
            console.log(`   📁 ${stats.categoriesInserted} categorías importadas...`)
          }
        } catch (error) {
          const errorMsg = 'Error importando categoría ' + String(category.name) + ': ' + String(error)
          stats.errors.push(errorMsg)
          console.warn('⚠️ ', errorMsg)
        }
      }

      // 3. Actualizar parentId de las categorías ahora que tenemos todos los IDs
      console.log('')
      console.log('🔄 Actualizando relaciones de categorías padre...')
      for (const category of data.categories) {
        if (category.parentId != null) {
          const newId = categoryIdMap.get(category._id)
          const newParentId = categoryIdMap.get(category.parentId)

          if (newId != null && newParentId != null) {
            await categoriesCollection.updateOne(
              { _id: newId },
              { $set: { parentId: newParentId } }
            )
          }
        }
      }
      console.log('   ✅ Relaciones actualizadas')

      // 4. Importar links con el userId correcto
      console.log('')
      console.log('🔗 Importando links...')
      for (const link of data.links) {
        try {
          // Generar nuevo ObjectId para el link
          const newId = new ObjectId()

          // Obtener el nuevo categoryId del mapa
          const newCategoryId = link.categoryId != null
            ? categoryIdMap.get(link.categoryId) ?? null
            : null

          // Crear documento con el userId como ObjectId y nuevo _id
          const linkDoc = {
            ...link,
            _id: newId,
            user: userId,
            categoryId: newCategoryId,
            // Renombrar imgURL a imgUrl si existe
            imgUrl: link.imgURL ?? link.imgUrl ?? null,
            url: link.URL ?? ''
          }

          // Eliminar campos que no necesitamos
          delete linkDoc.userName
          delete linkDoc.imgURL // Eliminar el campo con nombre incorrecto

          await linksCollection.insertOne(linkDoc)
          stats.linksInserted++

          if (stats.linksInserted % 500 === 0) {
            console.log(`   🔗 ${stats.linksInserted} links importados...`)
          }
        } catch (error) {
          const errorMsg = 'Error importando link ' + String(link.name) + ': ' + String(error)
          stats.errors.push(errorMsg)
          console.warn('⚠️ ', errorMsg)
        }
      }

      // Mostrar estadísticas finales
      console.log('')
      console.log('✅ Importación completada!')
      console.log('📊 Estadísticas:')
      console.log(`   🗑️  Categorías eliminadas: ${stats.categoriesDeleted}`)
      console.log(`   🗑️  Links eliminados: ${stats.linksDeleted}`)
      console.log(`   📁 Categorías insertadas: ${stats.categoriesInserted}`)
      console.log(`   🔗 Links insertados: ${stats.linksInserted}`)
      console.log(`   ❌ Errores: ${stats.errors.length}`)

      if (stats.errors.length > 0) {
        console.log('')
        console.log('❌ Errores encontrados:')
        stats.errors.forEach(error => console.log(`   - ${error}`))
      }

      return stats
    } catch (error) {
      console.error('💥 Error durante la importación:', error)
      throw error
    }
  }

  /**
   * Valida la integridad de los datos importados
   */
  async validateImport (): Promise<void> {
    if (this.db == null) {
      throw new Error('❌ No hay conexión a la base de datos')
    }

    const userId = new ObjectId(TARGET_USER_ID)

    console.log('')
    console.log('🔍 Validando integridad de los datos...')

    const categoriesCollection = this.db.collection('categories')
    const linksCollection = this.db.collection('links')

    // Contar documentos del usuario
    const categoriesCount = await categoriesCollection.countDocuments({ user: userId })
    const linksCount = await linksCollection.countDocuments({ user: userId })

    console.log(`📁 Total categorías del usuario: ${categoriesCount}`)
    console.log(`🔗 Total links del usuario: ${linksCount}`)

    // Verificar categorías padre
    const topCategories = await categoriesCollection.countDocuments({ user: userId, level: 0 })
    const subCategories = await categoriesCollection.countDocuments({ user: userId, level: 1 })

    console.log(`📂 Categorías padre (nivel 0): ${topCategories}`)
    console.log(`📁 Subcategorías (nivel 1): ${subCategories}`)

    // Verificar links huérfanos
    const userCategoryIds = await categoriesCollection.distinct('_id', { user: userId })
    const linksWithoutCategory = await linksCollection.countDocuments({
      user: userId,
      categoryId: { $nin: userCategoryIds }
    })

    if (linksWithoutCategory > 0) {
      console.warn(`⚠️  ${linksWithoutCategory} links sin categoría válida encontrados`)
    } else {
      console.log('✅ Todos los links tienen categorías válidas')
    }

    console.log('✅ Validación completada')
  }
}

// Script principal para ejecutar la importación
export async function runImport (dataFile?: string): Promise<void> {
  const importer = new DataImporter()

  try {
    const defaultDataFile = path.join(__dirname, '..', 'conversion', 'convertedData.json')
    const inputFile = dataFile ?? defaultDataFile

    if (!fs.existsSync(inputFile)) {
      console.error(`❌ Archivo de datos no encontrado: ${inputFile}`)
      console.log('💡 Ejecuta primero la conversión: npm run convert-data')
      return
    }

    console.log('🚀 Iniciando importación de datos...')
    console.log(`📁 Archivo: ${inputFile}`)
    console.log(`👤 Usuario destino: ${TARGET_USER_ID}`)
    console.log('')
    console.log('⚠️  ATENCIÓN: Se eliminarán todos los datos existentes del usuario')
    console.log('')

    await importer.connect()
    await importer.importData(inputFile)
    await importer.validateImport()

    console.log('')
    console.log('🎉 Importación finalizada exitosamente!')
  } catch (error) {
    console.error('💥 Error durante la importación:', error)
    process.exit(1)
  } finally {
    await importer.disconnect()
  }
}

// Si se ejecuta directamente
if (require.main === module) {
  runImport()
    .then(() => console.log('✨ Proceso completado'))
    .catch(error => console.error('💥 Error:', error))
}
