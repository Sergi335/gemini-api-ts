import { checkParentSlugStatus } from '../migrateParentSlug'

checkParentSlugStatus()
  .then(() => {
    console.log('✅ Verificación completada')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error en la verificación:', error)
    process.exit(1)
  })
