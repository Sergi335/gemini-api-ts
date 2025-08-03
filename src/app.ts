import cookieParser from 'cookie-parser'
import express from 'express'
import { env } from './config/env'
import { dbConnect } from './config/mongodb'
import { checkUserSession } from './middlewares/checkUserSession'
import cors from './middlewares/cors'
import { attachCsrfToken } from './middlewares/csrfToken'
import { globalErrorHandler } from './middlewares/errorHandler'
import { authRouter } from './routes/auth/auth'
import { categoriesRouter } from './routes/categories/categories'
import { linksRouter } from './routes/links/links'
import { storageRouter } from './routes/storage/storage'

const app = express()
export default app

// Middleware
app.use(express.json())
app.use(cookieParser())

app.use(cors)
app.get('/', attachCsrfToken('/', 'csrfToken', (Math.random() * 100000000000000000).toString()))
app.use('/auth', authRouter)
app.use('/links', checkUserSession, linksRouter)
app.use('/categories', checkUserSession, categoriesRouter)
app.use('/storage', checkUserSession, storageRouter)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' })
})
// app.get('/search', searchController.searchLinks)

// Global error handler - debe ir al final
app.use(globalErrorHandler)

const port = parseInt(env.PORT, 10)

// export const firebaseApp = initializeFirebase()

void (async () => {
  await dbConnect()
  app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
  })
})()
