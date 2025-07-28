/**
 * Script de ejemplo para convertir datos antiguos al nuevo formato jerárquico
 *
 * Uso:
 * 1. Coloca tus datos antiguos en sergiadn335@gmail.comdataBackup.json
 * 2. Ejecuta: npm run convert-data
 * 3. Los datos convertidos se guardarán en convertedData.json
 */

import { runConversion } from './dataConverter'

// Ejecutar conversión con configuración personalizada
async function main (): Promise<void> {
  try {
    console.log('🚀 Iniciando conversión de datos...')

    // Puedes personalizar los parámetros aquí:
    // runConversion(inputFile, outputFile, userName)
    await runConversion()

    console.log('✨ ¡Conversión completada exitosamente!')
    console.log('📄 Revisa el archivo convertedData.json para ver los resultados')
    console.log('')
    console.log('💡 Próximos pasos:')
    console.log('   1. Revisa los datos convertidos')
    console.log('   2. Importa los datos a tu base de datos')
    console.log('   3. Ejecuta las pruebas para verificar la integridad')
  } catch (error) {
    console.error('❌ Error durante la conversión:', error)
    process.exit(1)
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  void main()
}

export { main as convertData }
