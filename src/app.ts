import express, { Request, Response } from 'express'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import cors from './middlewares/cors'
import { dbConnect } from './config/mongodb'
import { categoriesRouter } from './routes/categories/categories'

dotenv.config()

const app = express()
export default app

// Middleware
app.use(cors)
app.use(express.json())
app.use(cookieParser())

app.get('/', (_: Request, res: Response) => {
  res.send('Hello World!')
})
app.use('/api/categories', categoriesRouter)
const port = process.env.PORT ?? 3000
void (async () => {
  await dbConnect()
  app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
  })
})()
