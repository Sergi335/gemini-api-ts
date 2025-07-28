/**
 * Script para importar los datos convertidos a la base de datos MongoDB
 *
 * Este script toma el archivo convertedData.json y lo importa directamente
 * a las colecciones de categorías y links en MongoDB
 */

import fs from 'fs'
import path from 'path'
import { MongoClient, Db } from 'mongodb'

// URI de conexión directa a la base de datos de desarrollo
const DB_URI_TEST = 'mongodb+srv://sergiadn335:odthG7LKmcR2gqi8@cluster1.eiw7kyo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1'

interface ImportData {
  categories: any[]
  links: any[]
}

interface ImportStats {
  categoriesInserted: number
  linksInserted: number
  categoriesSkipped: number
  linksSkipped: number
  errors: string[]
}

export class DataImporter {
  private db: Db | null = null
  private client: MongoClient | null = null

  /**
   * Conecta a la base de datos MongoDB de desarrollo
   */
  async connect (): Promise<void> {
    try {
      this.client = new MongoClient(DB_URI_TEST)
      await this.client.connect()
      this.db = this.client.db()
      console.log('✅ Conectado a MongoDB (Base de datos de DESARROLLO) exitosamente')
      console.log('🏗️  Usando: Cluster1 (DB_URI_TEST)')
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
   * Importa los datos convertidos a las colecciones
   */
  async importData (dataPath: string, overwrite: boolean = false): Promise<ImportStats> {
    if (this.db == null) {
      throw new Error('❌ No hay conexión a la base de datos. Llama a connect() primero.')
    }

    const stats: ImportStats = {
      categoriesInserted: 0,
      linksInserted: 0,
      categoriesSkipped: 0,
      linksSkipped: 0,
      errors: []
    }

    try {
      // Leer el archivo de datos convertidos
      const rawData = fs.readFileSync(dataPath, 'utf8')
      const data: ImportData = JSON.parse(rawData)

      console.log('📊 Datos cargados desde:', dataPath)
      console.log('   📁 Categorías a importar:', data.categories.length)
      console.log('   🔗 Links a importar:', data.links.length)

      // Obtener referencias a las colecciones
      const categoriesCollection = this.db.collection('categories')
      const linksCollection = this.db.collection('links')

      // Limpiar colecciones si se solicita sobrescribir
      if (overwrite) {
        console.log('🧹 Limpiando colecciones existentes...')
        await categoriesCollection.deleteMany({})
        await linksCollection.deleteMany({})
        console.log('✅ Colecciones limpiadas')
      }

      // Importar categorías
      console.log('📁 Importando categorías...')
      for (const category of data.categories) {
        try {
          if (!overwrite) {
            // Verificar si ya existe
            const existing = await categoriesCollection.findOne({ _id: category._id })
            if (existing != null) {
              stats.categoriesSkipped++
              continue
            }
          }

          await categoriesCollection.insertOne(category)
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

      // Importar links
      console.log('🔗 Importando links...')
      for (const link of data.links) {
        try {
          if (!overwrite) {
            // Verificar si ya existe
            const existing = await linksCollection.findOne({ _id: link._id })
            if (existing != null) {
              stats.linksSkipped++
              continue
            }
          }

          await linksCollection.insertOne(link)
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
      console.log(`   📁 Categorías insertadas: ${stats.categoriesInserted}`)
      console.log(`   📁 Categorías omitidas: ${stats.categoriesSkipped}`)
      console.log(`   🔗 Links insertados: ${stats.linksInserted}`)
      console.log(`   🔗 Links omitidos: ${stats.linksSkipped}`)
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

    console.log('')
    console.log('🔍 Validando integridad de los datos...')

    const categoriesCollection = this.db.collection('categories')
    const linksCollection = this.db.collection('links')

    // Contar documentos
    const categoriesCount = await categoriesCollection.countDocuments()
    const linksCount = await linksCollection.countDocuments()

    console.log(`📁 Total categorías en BD: ${categoriesCount}`)
    console.log(`🔗 Total links en BD: ${linksCount}`)

    // Verificar categorías padre
    const topCategories = await categoriesCollection.countDocuments({ level: 0 })
    const subCategories = await categoriesCollection.countDocuments({ level: 1 })

    console.log(`📂 Categorías padre (nivel 0): ${topCategories}`)
    console.log(`📁 Subcategorías (nivel 1): ${subCategories}`)

    // Verificar links huérfanos
    const linksWithoutCategory = await linksCollection.countDocuments({
      categoryId: { $nin: await categoriesCollection.distinct('_id') }
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
export async function runImport (
  dataFile?: string,
  overwrite: boolean = false
): Promise<void> {
  const importer = new DataImporter()

  try {
    const defaultDataFile = path.join(__dirname, 'convertedData.json')
    const inputFile = dataFile ?? defaultDataFile

    if (!fs.existsSync(inputFile)) {
      console.error(`❌ Archivo de datos no encontrado: ${inputFile}`)
      console.log('💡 Ejecuta primero la conversión: npm run convert-data')
      return
    }

    console.log('🚀 Iniciando importación de datos...')
    console.log(`📁 Archivo: ${inputFile}`)
    console.log('🗄️  Base de datos: Cluster1 (DESARROLLO)')
    console.log(`🔄 Sobrescribir: ${overwrite ? 'Sí' : 'No'}`)
    console.log('')

    await importer.connect()
    await importer.importData(inputFile, overwrite)
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
  const overwrite = process.argv.includes('--overwrite')
  runImport(undefined, overwrite)
    .then(() => console.log('✨ Proceso completado'))
    .catch(error => console.error('💥 Error:', error))
}
