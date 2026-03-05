import { createLink, loginWithFirebaseIdToken, refreshCsrfToken } from '../lib/api.js'

const statusEl = document.getElementById('status')
const titleEl = document.getElementById('title')
const urlEl = document.getElementById('url')
const categoryIdEl = document.getElementById('categoryId')

function setStatus (data) {
  statusEl.textContent = JSON.stringify(data, null, 2)
}

document.getElementById('prefillTab').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  titleEl.value = tab?.title ?? ''
  urlEl.value = tab?.url ?? ''
  setStatus({ ok: true, message: 'Formulario completado con pestaña actual' })
})

document.getElementById('refreshCsrf').addEventListener('click', async () => {
  try {
    const data = await refreshCsrfToken()
    setStatus({ ok: true, action: 'refreshCsrfToken', data })
  } catch (error) {
    setStatus({ ok: false, error: error.message })
  }
})

document.getElementById('login').addEventListener('click', async () => {
  try {
    const data = await loginWithFirebaseIdToken()
    setStatus({ ok: true, action: 'login', data })
  } catch (error) {
    setStatus({ ok: false, error: error.message })
  }
})

document.getElementById('createLink').addEventListener('click', async () => {
  try {
    const data = await createLink({
      title: titleEl.value.trim(),
      url: urlEl.value.trim(),
      categoryId: categoryIdEl.value.trim()
    })
    setStatus({ ok: true, action: 'createLink', data })
  } catch (error) {
    setStatus({ ok: false, error: error.message })
  }
})

document.getElementById('openOptions').addEventListener('click', () => {
  chrome.runtime.openOptionsPage()
})
