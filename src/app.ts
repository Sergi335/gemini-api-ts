import cookieParser from 'cookie-parser'
import express from 'express'
import helmet from 'helmet'
import './config/firebase'
import { checkUserSession } from './middlewares/checkUserSession'
import cors from './middlewares/cors'
import { doubleCsrfProtection, generateCsrfToken } from './middlewares/csrf'
import { globalErrorHandler } from './middlewares/errorHandler'
import { authRouter } from './routes/auth/auth'
import { categoriesRouter } from './routes/categories/categories'
import { linksRouter } from './routes/links/links'
import { searchRouter } from './routes/search/search'
import { storageRouter } from './routes/storage/storage'
import { stripeRouter } from './routes/stripe/stripe'

const app = express()

// Trust proxy - necesario para cookies secure en Render/Heroku/etc
app.set('trust proxy', 1)

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"], // Por defecto, solo permite recursos del propio dominio.
        scriptSrc: ["'self'"], // Permite scripts del propio dominio. Si usas un CDN, añádelo aquí.
        styleSrc: ["'self'", "'unsafe-inline'"], // Permite estilos del propio dominio y estilos en línea. Si usas Google Fonts, etc., añádelo aquí.
        imgSrc: ["'self'", 'data:', 'https:'], // Permite imágenes del propio dominio, data URIs y de Firebase Storage.
        connectSrc: ["'self'"], // Define a qué dominios se puede conectar el cliente (fetch, XHR). Si tu cliente llama a otras APIs, añádelas aquí.
        fontSrc: ["'self'"], // Permite fuentes del propio dominio.
        objectSrc: ["'none'"], // No permite plugins como <object>, <embed>, etc.
        mediaSrc: ["'self'"], // Permite medios del propio dominio.
        frameSrc: ["'none'"], // No permite que la página sea embebida en iframes.
        upgradeInsecureRequests: [] // Convierte las peticiones HTTP a HTTPS.
      }
    },
    // Para evitar problemas con CORS, es buena idea mantener esta configuración
    crossOriginEmbedderPolicy: false
  })
)

// Stripe webhook needs raw body - must be BEFORE express.json()
app.use('/stripe/webhook', express.raw({ type: 'application/json' }))

app.use(express.json())
app.use(cookieParser())
app.use(cors)

// Endpoint para obtener el token CSRF en la primera carga
app.get('/', (req, res) => {
  const csrfToken = generateCsrfToken(req, res)
  res.json({ csrfToken, message: 'Welcome to the Zenmarks API!' })
})

// Endpoint dedicado para renovar CSRF token (sin protección CSRF)
app.get('/csrf-token', (req, res) => {
  const csrfToken = generateCsrfToken(req, res)
  res.json({ csrfToken })
})

// Auth necesita CSRF pero no sesión previa
app.use('/auth', doubleCsrfProtection, authRouter)

// Rutas protegidas: CSRF + sesión
app.use('/links', doubleCsrfProtection, checkUserSession, linksRouter)
app.use('/categories', doubleCsrfProtection, checkUserSession, categoriesRouter)
app.use('/storage', doubleCsrfProtection, checkUserSession, storageRouter)
app.use('/search', doubleCsrfProtection, checkUserSession, searchRouter)
app.use('/stripe', stripeRouter)

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' })
})
// app.get('/search', searchController.searchLinks)

// Global error handler - debe ir al final
app.use(globalErrorHandler)

export default app
