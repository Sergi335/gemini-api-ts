import fs from 'fs'
import { ObjectId } from 'mongodb'
import path from 'path'

// Tipos para el formato antiguo
interface OldCategory {
  id?: string
  name: string
  desktop?: string
  links?: OldLink[]
  order?: number
}

interface OldLink {
  id?: string
  name: string
  url?: string
  URL?: string
  description?: string
  category?: string
  desktop?: string
  order?: number
  bookmark?: boolean
  bookmarkOrder?: number
  readlist?: boolean
  notes?: string
  images?: string[]
  imgURL?: string
}

// Tipos para el nuevo formato
interface NewCategory {
  _id: string
  name: string
  parentCategory?: string
  user: string
  order: number
  level: number
}

interface NewLink {
  _id: string
  name: string
  description: string
  URL: string
  imgURL: string
  categoryId: string
  order: number
  user: string
  notes: string
  images: string[]
  bookmark: boolean
  bookmarkOrder: number
  readlist: boolean
}

interface ConvertedData {
  categories: NewCategory[]
  links: NewLink[]
}

export class DataConverter {
  private readonly user: string
  private readonly categoryIdMap: Map<string, string> = new Map()
  private readonly desktopIdMap: Map<string, string> = new Map()

  constructor (user: string = 'SergioSR') {
    this.user = user
  }

  /**
   * Convierte datos del formato antiguo al nuevo formato jerárquico
   */
  convertOldDataToNew (oldData: any): ConvertedData {
    // Detectar el formato de los datos antiguos y convertir
    if (this.isDesktopFormat(oldData)) {
      return this.convertDesktopFormat(oldData)
    } else if (this.isFlatFormat(oldData)) {
      return this.convertFlatFormat(oldData)
    } else if (this.isDirectFormat(oldData)) {
      return this.convertDirectFormat(oldData)
    } else {
      throw new Error('Formato de datos no reconocido')
    }
  }

  /**
   * Detecta si los datos tienen formato de escritorios
   */
  private isDesktopFormat (data: any): boolean {
    return Boolean(data.desktops) || Boolean(data.escritorios) ||
           (Array.isArray(data) && data[0]?.categories !== undefined)
  }

  /**
   * Detecta si los datos tienen formato plano (categorías y links separados)
   */
  private isFlatFormat (data: any): boolean {
    return Boolean(data.categories) && Boolean(data.links) && Array.isArray(data.categories)
  }

  /**
   * Detecta si los datos están en formato directo (ya tienen la estructura nueva)
   */
  private isDirectFormat (data: any): boolean {
    return Array.isArray(data.categories) &&
           data.categories[0]?.level !== undefined
  }

  /**
   * Convierte formato de escritorios (escritorios como categorías padre)
   */
  private convertDesktopFormat (data: any): ConvertedData {
    const newCategories: NewCategory[] = []
    const newLinks: NewLink[] = []
    let categoryOrder = 0
    let linkOrder = 0

    const desktops = data.desktops ?? data.escritorios ?? data

    for (const desktop of desktops) {
      // Crear escritorio como categoría padre (nivel 0)
      const desktopId = new ObjectId().toString()
      const desktopCategory: NewCategory = {
        _id: desktopId,
        name: desktop.name ?? `Escritorio ${categoryOrder + 1}`,
        user: this.user,
        order: categoryOrder++,
        level: 0
      }
      newCategories.push(desktopCategory)
      this.desktopIdMap.set(desktop.id ?? desktop.name, desktopId)

      // Convertir categorías del escritorio (nivel 1)
      if (desktop.categories != null) {
        for (const category of desktop.categories) {
          const categoryId = new ObjectId().toString()
          const newCategory: NewCategory = {
            _id: categoryId,
            name: category.name,
            parentCategory: desktopId,
            user: this.user,
            order: category.order ?? 0,
            level: 1
          }
          newCategories.push(newCategory)
          this.categoryIdMap.set(category.id ?? category.name, categoryId)

          // Convertir links de la categoría
          if (category.links != null) {
            for (const link of category.links) {
              const newLink = this.convertLink(link, categoryId, linkOrder++)
              newLinks.push(newLink)
            }
          }
        }
      }

      // Convertir links directos del escritorio
      if (desktop.links != null) {
        for (const link of desktop.links) {
          const newLink = this.convertLink(link, desktopId, linkOrder++)
          newLinks.push(newLink)
        }
      }
    }

    return { categories: newCategories, links: newLinks }
  }

  /**
   * Convierte formato plano (categorías y links separados)
   */
  private convertFlatFormat (data: any): ConvertedData {
    const newCategories: NewCategory[] = []
    const newLinks: NewLink[] = []

    // Agrupar categorías por escritorio/desktop
    const desktopGroups = new Map<string, OldCategory[]>()

    for (const category of data.categories) {
      const desktop = category.desktop ?? 'General'
      if (!desktopGroups.has(desktop)) {
        desktopGroups.set(desktop, [])
      }
      const group = desktopGroups.get(desktop)
      if (group != null) {
        group.push(category)
      }
    }

    let categoryOrder = 0
    let linkOrder = 0

    // Crear escritorios como categorías padre y sus subcategorías
    for (const [desktopName, categories] of desktopGroups) {
      // Crear escritorio como categoría padre
      const desktopId = new ObjectId().toString()
      const desktopCategory: NewCategory = {
        _id: desktopId,
        name: desktopName,
        user: this.user,
        order: categoryOrder++,
        level: 0
      }
      newCategories.push(desktopCategory)
      this.desktopIdMap.set(desktopName, desktopId)

      // Crear subcategorías
      for (const category of categories) {
        const categoryId = new ObjectId().toString()
        const newCategory: NewCategory = {
          _id: categoryId,
          name: category.name,
          parentCategory: desktopId,
          user: this.user,
          order: category.order ?? 0,
          level: 1
        }
        newCategories.push(newCategory)
        this.categoryIdMap.set(category.id ?? category.name, categoryId)
      }
    }

    // Convertir links
    for (const link of data.links) {
      const categoryId = this.categoryIdMap.get(link.category) ??
                        this.desktopIdMap.get(link.desktop) ??
                        newCategories[0]?._id

      if (categoryId != null) {
        const newLink = this.convertLink(link, categoryId, linkOrder++)
        newLinks.push(newLink)
      }
    }

    return { categories: newCategories, links: newLinks }
  }

  /**
   * Convierte formato directo (ya tiene estructura jerárquica)
   */
  private convertDirectFormat (data: any): ConvertedData {
    // Si ya tiene el formato correcto, solo validar y limpiar
    const newCategories = data.categories.map((cat: any) => ({
      _id: cat._id ?? new ObjectId().toString(),
      name: cat.name,
      parentCategory: cat.parentCategory,
      user: cat.user ?? this.user,
      order: cat.order ?? 0,
      level: cat.level ?? 0
    }))

    const newLinks = data.links.map((link: any) => this.convertLink(link, link.categoryId, link.order ?? 0))

    return { categories: newCategories, links: newLinks }
  }

  /**
   * Convierte un link individual al nuevo formato
   */
  private convertLink (oldLink: OldLink, categoryId: string, order: number): NewLink {
    return {
      _id: oldLink.id ?? new ObjectId().toString(),
      name: oldLink.name ?? 'Link sin nombre',
      description: oldLink.description ?? '',
      URL: oldLink.url ?? oldLink.URL ?? '',
      imgURL: oldLink.imgURL ?? '',
      categoryId,
      order,
      user: this.user,
      notes: oldLink.notes ?? '',
      images: oldLink.images ?? [],
      bookmark: oldLink.bookmark ?? false,
      bookmarkOrder: oldLink.bookmarkOrder ?? 0,
      readlist: oldLink.readlist ?? false
    }
  }

  /**
   * Convierte un archivo de datos y guarda el resultado
   */
  async convertFile (inputPath: string, outputPath: string): Promise<void> {
    try {
      const inputData = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
      const convertedData = this.convertOldDataToNew(inputData)

      fs.writeFileSync(outputPath, JSON.stringify(convertedData, null, 2))
      console.log(`✅ Conversión completada: ${inputPath} -> ${outputPath}`)
      console.log('📊 Estadísticas:')
      console.log(`   - Categorías: ${convertedData.categories.length}`)
      console.log(`   - Links: ${convertedData.links.length}`)

      // Mostrar estructura de categorías
      const topLevelCategories = convertedData.categories.filter(c => c.level === 0)
      console.log('📁 Estructura de categorías:')
      for (const topCategory of topLevelCategories) {
        console.log(`   📂 ${topCategory.name}`)
        const subCategories = convertedData.categories.filter(c => c.parentCategory === topCategory._id)
        for (const subCategory of subCategories) {
          console.log(`      📁 ${subCategory.name}`)
        }
      }
    } catch (error) {
      console.error('❌ Error durante la conversión:', error)
      throw error
    }
  }
}

// Script principal para ejecutar la conversión
export async function runConversion (inputFile?: string, outputFile?: string, user?: string): Promise<void> {
  const converter = new DataConverter(user)

  const defaultInputFile = path.join(__dirname, 'sergiadn335@gmail.comdataBackup.json')
  const defaultOutputFile = path.join(__dirname, 'convertedData.json')

  const input = inputFile ?? defaultInputFile
  const output = outputFile ?? defaultOutputFile

  if (!fs.existsSync(input)) {
    console.error(`❌ Archivo de entrada no encontrado: ${input}`)
    console.log(`💡 Crea un archivo con tus datos antiguos en: ${input}`)
    console.log('📝 O usa: runConversion(\'ruta/a/tu/archivo.json\')')
    return
  }

  await converter.convertFile(input, output)
}

// Si se ejecuta directamente
if (require.main === module) {
  runConversion()
    .then(() => console.log('🎉 Conversión finalizada'))
    .catch(error => console.error('💥 Error:', error))
}
