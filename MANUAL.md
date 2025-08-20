# Manual de Uso: Extractor de Artículos

Este documento describe cómo utilizar la funcionalidad para extraer y almacenar el contenido principal de un artículo asociado a un link existente.

## Funcionalidad

Al llamar a este endpoint para un link específico:
1.  El sistema comprueba si el artículo ya ha sido extraído y guardado previamente.
2.  Si ya existe, lo devuelve directamente desde la base de datos.
3.  Si no existe, extrae el contenido de la URL del link, lo guarda en la base de datos asociado a ese link, y lo devuelve.

## Endpoint

Para utilizar el extractor, debes realizar una petición al siguiente endpoint:

- **URL:** `/links/:linkId/extract`
- **Método:** `POST`
- **Autenticación:** Requerida (la misma que para los endpoints de `links` y `categories`).

## Parámetros de la Ruta

| Parámetro | Tipo   | Descripción                      | Requerido |
|-----------|--------|----------------------------------|-----------|
| `linkId`  | string | El ID del link del cual se extraerá el artículo. | Sí        |

## Formato de la Petición

La petición no requiere un cuerpo (body). Solo es necesario especificar el `linkId` en la URL.

**Ejemplo de Petición (usando cURL):**

```bash
curl -X POST \
  http://localhost:3000/links/60d21b4667d0d8992e610c85/extract \
  -H 'Cookie: session=tu_cookie_de_sesion'
```

## Formato de la Respuesta Exitosa

Si la petición es exitosa, la API devolverá un estado `200 OK` y un objeto JSON con la información extraída (ya sea desde la base de datos o recién procesada).

**Ejemplo de Respuesta:**

```json
{
  "title": "Un Gran Artículo",
  "content": "<div><p>Este es el párrafo principal del artículo...</p></div>",
  "textContent": "Este es el párrafo principal del artículo...",
  "length": 1234,
  "excerpt": "Un resumen o extracto del artículo...",
  "byline": "Nombre del Autor",
  "dir": "ltr",
  "siteName": "Noticias de Ejemplo"
}
```

## Manejo de Errores

La API puede devolver los siguientes errores:

- **`401 Unauthorized`**: Si la petición no incluye una cookie de sesión válida.
- **`404 Not Found`**: Si no se encuentra ningún link con el `linkId` proporcionado que pertenezca al usuario.
- **`500 Internal Server Error`**: Si ocurre un error al intentar acceder a la URL (ej. no existe, el servidor remoto falla) o si la librería no puede extraer el contenido del artículo. El cuerpo de la respuesta incluirá un mensaje con más detalles sobre el error.