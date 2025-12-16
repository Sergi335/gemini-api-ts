import dotenv from 'dotenv'
import fs from 'fs'
import mongoose from 'mongoose'
import path from 'path'
import { fileURLToPath } from 'url'
dotenv.config()

// --- ESQUEMAS DE MONGOOSE (Sin cambios) ---

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true }
}, { timestamps: true, versionKey: false })

const CategorySchema = new mongoose.Schema({
  name: { type: String },
  displayName: { type: String },
  slug: { type: String, unique: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'category', default: null },
  parentSlug: { type: String },
  isEmpty: { type: Boolean },
  order: { type: Number },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
  hidden: { type: Boolean, default: false },
  level: { type: Number, default: 0 }
}, { timestamps: true, versionKey: false })

const LinkSchema = new mongoose.Schema({
  name: { type: String },
  description: { type: String, default: 'Description' },
  url: { type: String },
  imgUrl: { type: String },
  categoryName: { type: String },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'category' },
  order: { type: Number },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
  notes: { type: String },
  images: { type: Array },
  bookmark: { type: Boolean, default: false },
  bookmarkOrder: { type: Number, default: 0 },
  readlist: { type: Boolean, default: false }
}, { timestamps: true, versionKey: false })

const User = mongoose.model('user', UserSchema)
const Category = mongoose.model('category', CategorySchema)
const Link = mongoose.model('link', LinkSchema)

// --- LÓGICA DEL SCRIPT DE IMPORTACIÓN ---

async function importData () {
  const MONGO_URI = process.env.DB_URI_TEST // <-- CAMBIA ESTO
  await mongoose.connect(MONGO_URI)
  console.log('Conectado a MongoDB...')

  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const filePath = path.join(__dirname, 'sergiadn335@gmail.comdataBackup.json')
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

  const { escritorios, columnas, links } = data

  console.log('Limpiando colecciones antiguas...')
  await User.deleteMany({})
  await Category.deleteMany({})
  await Link.deleteMany({})

  console.log('Creando usuario...')
  const user = await new User({ email: 'sergiadn335@gmail.com' }).save()
  const userId = user._id
  console.log(`Usuario creado con ID: ${userId}`)

  const idMap = new Map()
  const slugMap = new Map()

  console.log('Importando escritorios (categorías padre)...')
  const parentCategoriesData = escritorios.map(escritorio => {
    const { _id, orden, ...rest } = escritorio
    return { ...rest, order: orden, level: 0, slug: escritorio.name, parentId: null, parentSlug: null, user: userId, _oldId: _id }
  })
  const parentCategories = await Category.insertMany(parentCategoriesData)

  const existingSlugs = new Set()
  parentCategories.forEach(cat => {
    idMap.set(cat._oldId, cat._id)
    slugMap.set(cat.slug, cat._id)
    existingSlugs.add(cat.slug)
  })
  console.log(`${parentCategories.length} categorías padre importadas.`)

  console.log('Importando columnas (subcategorías)...')
  const childCategoriesData = columnas.map(columna => {
    // --- CORRECCIÓN AQUÍ: El campo en el JSON original es 'order', no 'orden' ---
    const { _id, escritorio, order, vacio, ...rest } = columna
    const parentId = slugMap.get(escritorio)

    if (!parentId) {
      console.warn(`Padre '${escritorio}' no encontrado para la columna '${columna.name}'. Se omitirá.`)
      return null
    }

    let finalSlug = columna.slug
    if (existingSlugs.has(finalSlug)) {
      finalSlug = `${finalSlug}_${escritorio.substring(0, 4)}_${_id.slice(-4)}`
      console.warn(`Slug duplicado encontrado: "${columna.slug}". Renombrando a "${finalSlug}"`)
    }
    existingSlugs.add(finalSlug)

    return {
      ...rest,
      order, // Usamos la variable 'order' que acabamos de desestructurar
      isEmpty: vacio || false,
      level: 1,
      parentId,
      parentSlug: escritorio,
      user: userId,
      slug: finalSlug,
      _oldId: _id
    }
  }).filter(Boolean)

  const childCategories = await Category.insertMany(childCategoriesData)

  childCategoriesData.forEach((originalCatData, index) => {
    const newMongoId = childCategories[index]._id
    idMap.set(originalCatData._oldId, newMongoId)
  })
  console.log(`${childCategories.length} subcategorías importadas.`)

  console.log('Importando enlaces...')
  const linksToImport = links.map(link => {
    const { _id, URL, imgURL, panel, idpanel, orden, ...rest } = link
    const newCategoryId = idMap.get(idpanel)

    if (!newCategoryId) {
      console.warn(`Categoría con ID antiguo '${idpanel}' no encontrada para el enlace '${link.name}'. Se omitirá.`)
      return null
    }

    return { ...rest, url: URL, imgUrl: imgURL, categoryName: panel, categoryId: newCategoryId, order: orden, user: userId }
  }).filter(Boolean)

  if (linksToImport.length > 0) {
    await Link.insertMany(linksToImport)
    console.log(`${linksToImport.length} enlaces importados correctamente.`)
  } else {
    console.log('No se importaron enlaces.')
  }
}

// Ejecutar el script
async function main () {
  try {
    await importData()
    console.log('\n¡Importación completada con éxito!')
  } catch (error) {
    console.error('Ocurrió un error durante la importación:', error)
  } finally {
    await mongoose.connection.close()
    console.log('Conexión a MongoDB cerrada.')
  }
}

main()
