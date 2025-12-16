require('dotenv').config()
const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3')

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
})

async function listBuckets () {
  // Debug: mostrar las variables de entorno
  console.log('🔧 Configuración:')
  console.log('  - Endpoint:', process.env.R2_ENDPOINT)
  console.log('  - Access Key ID:', process.env.R2_ACCESS_KEY_ID ? 'Configurado ✅' : 'NO configurado ❌')
  console.log('  - Secret Key:', process.env.R2_SECRET_ACCESS_KEY ? 'Configurado ✅' : 'NO configurado ❌')
  console.log('')

  try {
    const command = new ListBucketsCommand({})
    const response = await r2Client.send(command)

    console.log('📦 Buckets disponibles en R2:')
    if (response.Buckets && response.Buckets.length > 0) {
      response.Buckets.forEach(bucket => {
        console.log(`  - ${bucket.Name}`)
      })
    } else {
      console.log('  (No hay buckets creados)')
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Stack:', error)
  }
}

listBuckets()
