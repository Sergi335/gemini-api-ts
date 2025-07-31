import express from 'express'
import cookieParser from 'cookie-parser'
import cors from './middlewares/cors'
import { dbConnect } from './config/mongodb'
import { categoriesRouter } from './routes/categories/categories'
import { linksRouter } from './routes/links/links'
import { authRouter } from './routes/auth/auth'
import { checkUserSession } from './middlewares/checkSession'
import { env } from './config/env'
import { initializeFirebase } from './config/firebase'
import { attachCsrfToken } from './middlewares/csrfToken'

const app = express()
export default app

// Middleware
app.use(express.json())
app.use(cookieParser())

app.use(cors)
app.get('/', attachCsrfToken('/', 'csrfToken', (Math.random() * 100000000000000000).toString()), (req, res) => {
  res.send('Welcome to the Zenmarks API!')
})
app.use('/auth', authRouter)
app.use('/links', checkUserSession, linksRouter)
app.use('/categories', checkUserSession, categoriesRouter)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' })
})
// app.use('/storage', storageRouter)
// app.get('/search', searchController.searchLinks)

const port = parseInt(env.PORT, 10)

initializeFirebase()

void (async () => {
  await dbConnect()
  app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
  })
})()
