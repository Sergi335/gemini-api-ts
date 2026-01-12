import { env } from './config/env'
import app from './app'
import { dbConnect } from './config/mongodb'

const port = parseInt(env.PORT, 10)

// export const firebaseApp = initializeFirebase()

void (async () => {
  await dbConnect()
  app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
  })
})()
