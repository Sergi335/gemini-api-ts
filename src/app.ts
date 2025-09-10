import cookieParser from 'cookie-parser'
import express from 'express'
import helmet from 'helmet'
import { checkUserSession } from './middlewares/checkUserSession'
import cors from './middlewares/cors'
import { attachCsrfToken } from './middlewares/csrfToken'
import { globalErrorHandler } from './middlewares/errorHandler'
import { authRouter } from './routes/auth/auth'
import { categoriesRouter } from './routes/categories/categories'
import { linksRouter } from './routes/links/links'
import { searchRouter } from './routes/search/search'
import { storageRouter } from './routes/storage/storage'

const app = express()

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"], // Por defecto, solo permite recursos del propio dominio.
        scriptSrc: ["'self'"], // Permite scripts del propio dominio. Si usas un CDN, añádelo aquí.
        styleSrc: ["'self'", "'unsafe-inline'"], // Permite estilos del propio dominio y estilos en línea. Si usas Google Fonts, etc., añádelo aquí.
        imgSrc: ["'self'", 'data:', 'firebasestorage.googleapis.com'], // Permite imágenes del propio dominio, data URIs y de Firebase Storage.
        connectSrc: ["'self'"], // Define a qué dominios se puede conectar el cliente (fetch, XHR). Si tu cliente llama a otras APIs, añádelas aquí.
        frameSrc: ["'none'"], // No permite que la página sea embebida en iframes.
        objectSrc: ["'none'"], // No permite plugins como <object>, <embed>, etc.
        upgradeInsecureRequests: [] // Convierte las peticiones HTTP a HTTPS.
      }
    },
    // Para evitar problemas con CORS, es buena idea mantener esta configuración
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false
  })
)
app.use(express.json())
app.use(cookieParser())

app.use(cors)
app.get('/', attachCsrfToken('/', 'csrfToken', (Math.random() * 100000000000000000).toString()))
app.use('/auth', authRouter)
app.use('/links', checkUserSession, linksRouter)
app.use('/categories', checkUserSession, categoriesRouter)
app.use('/storage', checkUserSession, storageRouter)
app.use('/search', checkUserSession, searchRouter)

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' })
})
// app.get('/search', searchController.searchLinks)

// Global error handler - debe ir al final
app.use(globalErrorHandler)

export default app
