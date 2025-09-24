# Configuración de Cloudflare R2 Storage

## 1. Instalar Dependencias

```powershell
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

## 2. Variables de Entorno

Agregar las siguientes variables al archivo `.env`:

```env
# Cloudflare R2 Configuration
R2_ENDPOINT=https://[tu-account-id].r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=tu_access_key_id
R2_SECRET_ACCESS_KEY=tu_secret_access_key
R2_BUCKET_NAME=tu_bucket_name
```

### Cómo obtener las credenciales:

1. **Acceder a Cloudflare Dashboard**:
   - Ve a https://dash.cloudflare.com/
   - Selecciona tu cuenta

2. **Crear bucket R2**:
   - Ve a "R2 Object Storage"
   - Crea un nuevo bucket o usa uno existente

3. **Obtener credenciales**:
   - Ve a "R2 Object Storage" > "Manage R2 API tokens"
   - Crea un nuevo token API con permisos de lectura/escritura
   - Guarda el `Access Key ID` y `Secret Access Key`

4. **Obtener endpoint**:
   - En tu bucket, ve a "Settings" > "S3 API"
   - Copia el endpoint (formato: `https://[account-id].r2.cloudflarestorage.com`)

## 3. Migración de Rutas

### Actualizar importaciones en las rutas:

```typescript
// Antes
import { storageController } from '../controllers/storageController'

// Después
import { storageControllerNew } from '../controllers/storageControllerNew'
```

### Métodos disponibles:

- `getBackgroundsMiniatures()` - Obtener miniaturas de fondos
- `uploadImage()` - Subir imagen de link
- `deleteImage()` - Eliminar imagen de link
- `uploadIcon()` - Subir icono personalizado
- `deleteIcon()` - Eliminar icono personalizado
- `getLinkIcons()` - Obtener iconos de usuario
- `getBackgroundUrl()` - Obtener URL de fondo
- `getUserBackup()` - Obtener respaldo de usuario
- `uploadProfileImage()` - Subir imagen de perfil
- `deleteAllUserFiles()` - Eliminar todos los archivos del usuario
- `getSignedFileUrl()` - **NUEVO** - Obtener URL firmada para cualquier archivo

## 4. Ventajas del nuevo sistema:

### URLs Firmadas:
- **Seguridad**: Acceso controlado y temporizado a archivos
- **Privacidad**: Los archivos no son públicos por defecto
- **Control**: URLs con expiración configurable (default: 1 hora)

### Compatibilidad S3:
- API compatible con Amazon S3
- Herramientas existentes funcionan sin modificación
- Migración simplificada desde otros servicios S3

### Rendimiento Cloudflare:
- Red global de CDN integrada
- Menor latencia mundial
- Mejor rendimiento que Firebase Storage

## 5. Testing

Crear tests para el nuevo controlador:

```typescript
// src/controllers/storageControllerNew.test.ts
import { storageControllerNew } from './storageControllerNew'

describe('storageControllerNew', () => {
  // Tests aquí
})
```

## 6. Rollback Plan

Si necesitas volver a Firebase Storage:
1. Revertir las importaciones en las rutas
2. Los datos en Firebase Storage permanecen intactos
3. No hay pérdida de funcionalidad

## 7. Monitoreo

- Cloudflare Dashboard proporciona métricas detalladas
- Logs de requests/responses disponibles
- Alertas configurables para uso y errores