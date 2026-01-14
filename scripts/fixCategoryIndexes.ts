import { connect, disconnect, connection } from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

async function fixIndexes() {
  const uri = process.env.DB_URI_TEST || process.env.DB_URI_TEST
  if (!uri) {
    console.error('No DB_URI found in .env')
    process.exit(1)
  }

  try {
    console.log('Connecting to database...')
    await connect(uri)
    
    console.log('Accessing categories collection...')
    const categories = connection.collection('categories')
    
    console.log('Current indexes:')
    const indexes = await categories.indexes()
    console.log(JSON.stringify(indexes, null, 2))
    
    const hasOldIndex = indexes.some(idx => idx.name === 'slug_1')
    
    if (hasOldIndex) {
      console.log('Dropping old "slug_1" index...')
      await categories.dropIndex('slug_1')
      console.log('Successfully dropped "slug_1" index!')
    } else {
      console.log('Old "slug_1" index not found. No action needed.')
    }

    console.log('Ensuring new indexes are created...')
    // Note: Mongoose will create the new { user: 1, slug: 1 } index when the app starts
    // but we can list indexes again to verify.
    const newIndexes = await categories.indexes()
    console.log('Updated indexes:')
    console.log(JSON.stringify(newIndexes, null, 2))

  } catch (error) {
    console.error('Error fixing indexes:', error)
  } finally {
    await disconnect()
    console.log('Disconnected.')
  }
}

fixIndexes()
