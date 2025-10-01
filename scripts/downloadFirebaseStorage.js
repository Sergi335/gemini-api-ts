require('dotenv').config()
const admin = require('firebase-admin')
const fs = require('fs')
const path = require('path')

// Configurar Firebase Admin usando variables de entorno
const serviceAccount = {
  type: process.env.FBADMIN_TYPE,
  project_id: process.env.FBADMIN_PROJECT_ID,
  private_key_id: process.env.FBADMIN_PRIVATE_KEY_ID,
  private_key: process.env.FBADMIN_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/^["']|["']$/g, ''),
  client_email: process.env.FBADMIN_CLIENT_EMAIL,
  client_id: process.env.FBADMIN_CLIENT_ID,
  auth_uri: process.env.FBADMIN_AUTH_URI,
  token_uri: process.env.FBADMIN_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FBADMIN_AUTH_PROV_509,
  client_x509_cert_url: process.env.FBADMIN_CLIENT_509,
  universe_domain: process.env.FBADMIN_UNIVERSE_DOM
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FB_STORAGE_BUCKET
})

const bucket = admin.storage().bucket()

const stats = {
  totalFiles: 0,
  downloadedFiles: 0,
  failedFiles: 0,
  totalSize: 0,
  failedFilesList: []
}

async function downloadAllFiles (outputDir) {
  console.log('🚀 Iniciando descarga de archivos de Firebase Storage...')
  console.log(`📁 Bucket: ${process.env.FB_STORAGE_BUCKET}`)
  console.log(`📁 Directorio de salida: ${outputDir}\n`)

  try {
    // Crear directorio de salida si no existe
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    // Obtener todos los archivos del bucket
    console.log('📡 Obteniendo lista de archivos...')
    const [files] = await bucket.getFiles()
    stats.totalFiles = files.length

    console.log(`📊 Total de archivos encontrados: ${stats.totalFiles}\n`)

    if (stats.totalFiles === 0) {
      console.log('⚠️  No se encontraron archivos en el bucket')
      return
    }

    // Descargar cada archivo respetando la estructura
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        const fileName = file.name

        // Obtener metadata primero para verificar si el archivo tiene contenido
        const [metadata] = await file.getMetadata()
        const fileSize = parseInt(metadata.size || '0', 10)

        // Si el archivo está vacío o es una carpeta, saltarlo
        if (fileSize === 0 || fileName.endsWith('/')) {
          console.log(`⏭️  [${stats.downloadedFiles + stats.failedFiles + 1}/${stats.totalFiles}] Omitido: ${fileName} (vacío o carpeta)`)
          stats.failedFiles++
          stats.failedFilesList.push({ name: fileName, error: 'Archivo vacío o carpeta' })
          continue
        }

        const localPath = path.join(outputDir, fileName)
        const localDir = path.dirname(localPath)

        // Crear directorios si no existen
        if (!fs.existsSync(localDir)) {
          fs.mkdirSync(localDir, { recursive: true })
        }

        // Descargar archivo
        await file.download({ destination: localPath })
        stats.totalSize += fileSize

        stats.downloadedFiles++
        console.log(`✅ [${stats.downloadedFiles}/${stats.totalFiles}] ${fileName} (${formatBytes(fileSize)})`)
      } catch (error) {
        stats.failedFiles++
        stats.failedFilesList.push({ name: file.name, error: error.message })
        console.error(`❌ [${stats.downloadedFiles + stats.failedFiles}/${stats.totalFiles}] Error descargando ${file.name}:`, error.message)
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('📈 RESUMEN DE DESCARGA')
    console.log('='.repeat(60))
    console.log(`✅ Archivos descargados: ${stats.downloadedFiles}`)
    console.log(`❌ Archivos fallidos: ${stats.failedFiles}`)
    console.log(`📦 Tamaño total: ${formatBytes(stats.totalSize)}`)
    console.log(`📁 Ubicación: ${path.resolve(outputDir)}`)
    console.log('='.repeat(60))

    if (stats.failedFiles > 0) {
      console.log('\n⚠️  ARCHIVOS FALLIDOS:')
      stats.failedFilesList.forEach(item => {
        console.log(`  - ${item.name}: ${item.error}`)
      })
    }
  } catch (error) {
    console.error('❌ Error fatal:', error.message)
    throw error
  }
}

function formatBytes (bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Math.round(bytes / Math.pow(k, i) * 100) / 100} ${sizes[i]}`
}

// Ejecutar script
const outputDirectory = process.argv[2] || './firebase-storage-backup'

downloadAllFiles(outputDirectory)
  .then(() => {
    console.log('\n✨ Descarga completada exitosamente!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Error durante la descarga:', error)
    process.exit(1)
  })
