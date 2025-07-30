import express from 'express'
import cookieParser from 'cookie-parser'
import cors from './middlewares/cors'
import { dbConnect } from './config/mongodb'
import { categoriesRouter } from './routes/categories/categories'
import { linksRouter } from './routes/links/links'
import { authRouter } from './routes/auth/auth'
import { checkUserSession } from './controllers/authController'
import { env } from './config/env'

const app = express()
export default app

// Middleware
app.use(express.json())
app.use(cookieParser())

app.use(cors)
if (env.NODE_ENV === 'test') {
  app.use('/api/auth', authRouter)
  app.use('/api/links', linksRouter)
  app.use('/api/categories', categoriesRouter)
  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok' })
  })
  // app.use('/storage', storageRouter)
  // app.get('/search', searchController.searchLinks)
} else {
  app.use('/api/auth', authRouter)
  app.use('/api/links', checkUserSession, linksRouter)
  app.use('/api/categories', checkUserSession, categoriesRouter)
  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok' })
  })
  // app.use('/storage', checkUserSession, storageRouter)
  // app.get('/search', checkUserSession, searchController.searchLinks)
}

const port = parseInt(env.PORT, 10)

void (async () => {
  await dbConnect()
  app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
  })
})()
