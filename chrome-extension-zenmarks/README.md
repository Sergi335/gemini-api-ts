# Zenmarks Chrome Extension Skeleton

Esqueleto de **nuevo repositorio** para una extensión de Chrome que interactúa con `gemini-api-ts`.

## Qué incluye
- `manifest.json` (MV3).
- `src/popup`: UI para probar flujo básico.
- `src/options`: configuración de `apiBaseUrl` e `idToken`.
- `src/lib/api.js`: cliente API con `credentials: 'include'` y header CSRF.
- `docs/api-analysis.md`: análisis del backend actual y limitaciones.

## Estructura

```txt
chrome-extension-zenmarks/
├── docs/
│   └── api-analysis.md
├── src/
│   ├── background.js
│   ├── lib/
│   │   ├── api.js
│   │   └── storage.js
│   ├── options/
│   │   ├── options.html
│   │   └── options.js
│   └── popup/
│       ├── popup.css
│       ├── popup.html
│       └── popup.js
├── manifest.json
└── package.json
```

## Cómo usarlo como repo independiente

```bash
cd chrome-extension-zenmarks
git init
npm install
```

Cargar en Chrome:
1. `chrome://extensions`
2. Activar "Developer mode"
3. "Load unpacked" y seleccionar la carpeta `chrome-extension-zenmarks`.

## Flujo de prueba desde popup
1. Abrir **Options** y configurar `apiBaseUrl` + `idToken`.
2. En popup:
   - `Refrescar CSRF`
   - `Login`
   - `Usar pestaña actual`
   - `Crear link`

## Nota importante (CORS)
Para funcionar fuera del frontend oficial, probablemente necesitarás ajustar CORS en la API para permitir tu origin de extensión (`chrome-extension://<id>`).
