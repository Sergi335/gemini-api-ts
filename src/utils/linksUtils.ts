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
  console.log('🔍 [getLinkNameByUrlLocal] Iniciando petición para:', url)
  try {
    console.log('🌐 [getLinkNameByUrlLocal] Enviando request con headers:', JSON.stringify(browserHeaders, null, 2))

    const response = await axios.get(url, {
      headers: browserHeaders,
      httpsAgent,
      timeout: 10000, // 10 segundos de timeout
      maxRedirects: 5,
      validateStatus: (status) => status < 500 // Aceptar respuestas 2xx, 3xx y 4xx
    })

    console.log('✅ [getLinkNameByUrlLocal] Respuesta recibida:', {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers['content-type'],
      dataLength: typeof response.data === 'string' ? response.data.length : 'no es string'
    })

    const html = response.data

    if (typeof html !== 'string') {
      console.log('⚠️ [getLinkNameByUrlLocal] La respuesta no es un string:', typeof html)
      return new URL(url).hostname
    }

    console.log('📄 [getLinkNameByUrlLocal] Primeros 500 caracteres del HTML:', html.substring(0, 500))

    const $ = cheerio.load(html)

    // Intentar obtener el título de múltiples fuentes
    let title = $('title').text().trim()
    console.log('🏷️ [getLinkNameByUrlLocal] Título encontrado en <title>:', title || '(vacío)')

    // Si no hay título, intentar con og:title
    if (title === '' || title === undefined) {
      title = $('meta[property="og:title"]').attr('content') ?? ''
      console.log('🏷️ [getLinkNameByUrlLocal] Título encontrado en og:title:', title || '(vacío)')
    }

    // Si aún no hay título, intentar con twitter:title
    if (title === '' || title === undefined) {
      title = $('meta[name="twitter:title"]').attr('content') ?? ''
      console.log('🏷️ [getLinkNameByUrlLocal] Título encontrado en twitter:title:', title || '(vacío)')
    }

    // Si no se encontró ningún título, usar el hostname
    if (title === '' || title === undefined) {
      title = new URL(url).hostname
      console.log('🏷️ [getLinkNameByUrlLocal] Usando hostname como fallback:', title)
    }

    console.log('✅ [getLinkNameByUrlLocal] Título final:', title)
    return title
  } catch (error) {
    const axiosError = error as any
    console.error('❌ [getLinkNameByUrlLocal] Error capturado:', {
      message: axiosError.message,
      code: axiosError.code,
      status: axiosError.response?.status,
      statusText: axiosError.response?.statusText,
      responseData: axiosError.response?.data?.substring?.(0, 200) || axiosError.response?.data
    })

    const altTitle = new URL(url).hostname
    console.log('🔄 [getLinkNameByUrlLocal] Retornando hostname como fallback:', altTitle)
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
