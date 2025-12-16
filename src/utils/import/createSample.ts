/**
 * Crea un archivo de muestra para probar la importación
 */

import fs from 'fs'
import path from 'path'

async function createSample (): Promise<void> {
  const inputPath = path.join(__dirname, 'convertedData.json')
  const outputPath = path.join(__dirname, 'convertedData_sample.json')

  if (!fs.existsSync(inputPath)) {
    console.error('❌ Archivo convertedData.json no encontrado')
    return
  }

  const fullData = JSON.parse(fs.readFileSync(inputPath, 'utf8'))

  // Tomar una muestra pequeña
  const sampleData = {
    categories: fullData.categories.slice(0, 10), // Primeras 10 categorías
    links: fullData.links.slice(0, 50) // Primeros 50 links
  }

  fs.writeFileSync(outputPath, JSON.stringify(sampleData, null, 2))

  console.log('✅ Archivo de muestra creado:', outputPath)
  console.log('📊 Contenido:')
  console.log('   📁 Categorías:', sampleData.categories.length)
  console.log('   🔗 Links:', sampleData.links.length)
}

if (require.main === module) {
  createSample().catch(console.error)
}

export { createSample }
