import { rollbackParentSlug } from '../migrateParentSlug'

rollbackParentSlug()
  .then(() => {
    console.log('✅ Rollback completado')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error en el rollback:', error)
    process.exit(1)
  })
