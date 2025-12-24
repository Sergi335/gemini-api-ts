import axios from 'axios'
import * as cheerio from 'cheerio'
import crypto from 'node:crypto'
import https from 'node:https'

// Agente HTTPS que permite conexiones legacy y ignora errores de certificados en producción
const httpsAgent = new https.Agent({
  secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
  rejectUnauthorized: false // Solo para scraping, no usar en peticiones sensibles
})

// Headers que simulan un navegador real
const browserHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache'
}

export const getLinkNameByUrlLocal = async ({ url }: { url: string }): Promise<string> => {
  try {
    const response = await axios.get(url, {
      headers: browserHeaders,
      httpsAgent,
      timeout: 10000, // 10 segundos de timeout
      maxRedirects: 5,
      validateStatus: (status) => status < 500 // Aceptar respuestas 2xx, 3xx y 4xx
    })
    const html = response.data
    const $ = cheerio.load(html)

    // Intentar obtener el título de múltiples fuentes
    let title = $('title').text().trim()

    // Si no hay título, intentar con og:title
    if (title === '' || title === undefined) {
      title = $('meta[property="og:title"]').attr('content') ?? ''
    }

    // Si aún no hay título, intentar con twitter:title
    if (title === '' || title === undefined) {
      title = $('meta[name="twitter:title"]').attr('content') ?? ''
    }

    // Si no se encontró ningún título, usar el hostname
    if (title === '' || title === undefined) {
      title = new URL(url).hostname
    }

    console.log('El título de la página es: ' + title)
    return title
  } catch (error) {
    const altTitle = new URL(url).hostname
    console.error('Error al obtener el título de la página:', (error as Error).message)
    return altTitle
  }
}
export const getLinkStatusLocal = async ({ url }: { url: string }): Promise<{ status: string }> => {
  try {
    // Realizar la solicitud HTTP con Axios usando los headers de navegador
    const response = await axios.get(url, {
      headers: browserHeaders,
      httpsAgent,
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: () => true // Aceptar cualquier código de estado
    })
    const statusCode = response.status

    let status
    if (statusCode >= 100 && statusCode <= 199) {
      status = 'informational'
    } else if (statusCode >= 200 && statusCode <= 299) {
      status = 'success'
    } else if (statusCode >= 300 && statusCode <= 399) {
      status = 'redirect'
    } else if (statusCode >= 400 && statusCode <= 499) {
      status = 'clientErr'
    } else if (statusCode >= 500 && statusCode <= 599) {
      status = 'serverErr'
    }

    return { status: status ?? 'unknown' }
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'response' in error &&
      typeof (error as any).response === 'object' &&
      (error as any).response !== null &&
      'status' in (error as any).response
    ) {
      // Error de respuesta HTTP con un código de estado
      const statusCode = (error as any).response.status
      let status

      if (statusCode >= 100 && statusCode <= 199) {
        status = 'informational'
      } else if (statusCode >= 200 && statusCode <= 299) {
        status = 'success'
      } else if (statusCode >= 300 && statusCode <= 399) {
        status = 'redirect'
      } else if (statusCode >= 400 && statusCode <= 499) {
        status = 'clientErr'
      } else if (statusCode >= 500 && statusCode <= 599) {
        status = 'serverErr'
      }
      if (statusCode === 403) {
        status = 'success'
      }
      return { status: status ?? 'unknown' }
    } else {
      // Otro tipo de error
      console.error('Error:', error)
      return { status: 'unknown' }
    }
  }
}
