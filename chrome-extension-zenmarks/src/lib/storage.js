const DEFAULTS = {
  apiBaseUrl: 'https://zenmarks-api.onrender.com',
  csrfToken: '',
  idToken: ''
}

export async function getSettings () {
  const result = await chrome.storage.local.get(Object.keys(DEFAULTS))
  return { ...DEFAULTS, ...result }
}

export async function setSettings (updates) {
  await chrome.storage.local.set(updates)
}
