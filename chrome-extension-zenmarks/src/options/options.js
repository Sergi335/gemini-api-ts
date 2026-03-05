import { getSettings, setSettings } from '../lib/storage.js'

const apiBaseUrlEl = document.getElementById('apiBaseUrl')
const idTokenEl = document.getElementById('idToken')
const resultEl = document.getElementById('result')

async function hydrateForm () {
  const settings = await getSettings()
  apiBaseUrlEl.value = settings.apiBaseUrl
  idTokenEl.value = settings.idToken
}

document.getElementById('save').addEventListener('click', async () => {
  await setSettings({
    apiBaseUrl: apiBaseUrlEl.value.trim(),
    idToken: idTokenEl.value.trim()
  })

  resultEl.textContent = 'Configuración guardada'
})

hydrateForm().catch((error) => {
  resultEl.textContent = `Error: ${error.message}`
})
