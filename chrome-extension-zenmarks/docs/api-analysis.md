# Análisis rápido de gemini-api-ts

## Hallazgos clave
- La API está construida con Express y TypeScript.
- El login requiere `idToken` de Firebase y genera cookie de sesión en `POST /auth/login`.
- Las rutas de negocio (`/links`, `/categories`, `/storage`, `/search`) requieren CSRF + sesión.
- El token CSRF se obtiene en `GET /csrf-token`.

## Flujo recomendado para extensión
1. Llamar `GET /csrf-token`.
2. Llamar `POST /auth/login` con `{ idToken }` y `x-csrf-token`.
3. Enviar peticiones autenticadas con `credentials: include` + `x-csrf-token`.

## Consideraciones de integración
- El CORS actual del backend no contempla `chrome-extension://<id>`.
- Para producción, hay que permitir explícitamente el origin de la extensión (o usar un proxy).
