import { getSettings, setSettings } from './storage.js'

async function request (path, options = {}) {
  const { apiBaseUrl, csrfToken } = await getSettings()

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers ?? {})
  }

  if (csrfToken) {
    headers['x-csrf-token'] = csrfToken
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
    credentials: 'include'
  })

  if (!response.ok) {
    const errorBody = await safeJson(response)
    throw new Error(`${response.status} ${response.statusText}: ${JSON.stringify(errorBody)}`)
  }

  return safeJson(response)
}

async function safeJson (response) {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

export async function refreshCsrfToken () {
  const data = await request('/csrf-token', { method: 'GET', headers: {} })
  if (data.csrfToken) {
    await setSettings({ csrfToken: data.csrfToken })
  }
  return data
}

export async function loginWithFirebaseIdToken () {
  const { idToken } = await getSettings()

  if (!idToken) {
    throw new Error('Falta idToken en configuración. Define uno en Options.')
  }

  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ idToken })
  })
}

export async function getCategories () {
  return request('/categories', { method: 'GET' })
}

export async function createLink ({ url, title, categoryId }) {
  return request('/links', {
    method: 'POST',
    body: JSON.stringify({
      url,
      title,
      categoryId
    })
  })
}
