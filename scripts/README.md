# 📥 Scripts de Backup y Migración de Firebase Storage

## ✅ Descarga Completada

**Fecha:** 1 de octubre de 2025

### 📊 Estadísticas de Descarga:

- **Total de archivos en Firebase:** 199
- **Archivos descargados exitosamente:** 179 ✅
- **Archivos fallidos:** 20 ❌
- **Tamaño total descargado:** 206.26 MB
- **Ubicación:** `firebase-backup/`

### 📁 Estructura de Archivos Descargados:

```
firebase-backup/
├── SergioSR/
│   ├── images/
│   │   ├── backgrounds/
│   │   ├── icons/ (28 archivos)
│   │   ├── linkImages/ (89 archivos)
│   │   ├── miniatures/
│   │   └── profile/ (3 archivos)
│
├── sergiadn335@gmail.com/
│   ├── backups/
│   │   └── sergiadn335@gmail.comdataBackup.json (2.18 MB)
│   └── images/
│       ├── icons/ (1 archivo)
│       ├── linkImages/ (53 archivos)
│       └── profile/ (1 archivo)
│
├── user@mail.com/
│   └── backups/
│       └── user@mail.comdataBackup.json (14.59 KB)
│
├── usertest@mail.com/
│   └── images/
│       ├── linkImages/ (1 archivo)
│       └── profile/ (1 archivo)
│
├── backgrounds/ (carpeta vacía)
└── miniatures/ (carpeta vacía)
```

### ⚠️ Archivos Fallidos (20):

Los siguientes archivos no pudieron descargarse porque son **archivos vacíos (0 bytes)** o **marcadores de carpetas** en Firebase Storage sin contenido real:

**Carpeta backgrounds/ (10 archivos):**
- background1.webp
- background2.webp
- background3.webp
- background4.webp
- background5.webp
- background6.webp
- background7.webp
- background8.webp
- background9.webp
- background10.webp

**Carpeta miniatures/ (10 archivos):**
- background1.webp
- background2.webp
- background3.webp
- background4.webp
- background5.webp
- background6.webp
- background7.webp
- background8.webp
- background9.webp
- background10.webp

**Nota:** Estos archivos existen como referencias en Firebase Storage pero tienen 0 bytes de tamaño. No es un problema del script ni de la extensión `.webp`, sino que Firebase Storage los tiene listados pero sin contenido descargable. Los 179 archivos reales con contenido fueron descargados correctamente.

---

## 🚀 Uso del Script

### Comando básico:
```bash
node scripts/downloadFirebaseStorage.js
```

### Especificar carpeta de destino:
```bash
node scripts/downloadFirebaseStorage.js mi-carpeta-backup
```

---

## 📋 Requisitos

- Node.js v14 o superior
- Paquete `firebase-admin` instalado
- Variables de entorno configuradas en `.env`

---

## 🔧 Configuración

El script utiliza las siguientes variables de entorno del archivo `.env`:

- `FBADMIN_TYPE`
- `FBADMIN_PROJECT_ID`
- `FBADMIN_PRIVATE_KEY_ID`
- `FBADMIN_PRIVATE_KEY`
- `FBADMIN_CLIENT_EMAIL`
- `FBADMIN_CLIENT_ID`
- `FBADMIN_AUTH_URI`
- `FBADMIN_TOKEN_URI`
- `FBADMIN_AUTH_PROV_509`
- `FBADMIN_CLIENT_509`
- `FBADMIN_UNIVERSE_DOM`
- `FB_STORAGE_BUCKET`

---

## 📦 Próximo Paso: Migración a Cloudflare R2

Una vez descargados los archivos, puedes migrarlos a Cloudflare R2 usando el controlador `storageControllerNew.ts` que ya está configurado en el proyecto.

### Pasos para migrar:

1. ✅ Archivos descargados en `firebase-backup/`
2. ⏳ Instalar dependencias de AWS SDK:
   ```bash
   npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
   ```
3. ⏳ Configurar variables de entorno de R2 en `.env`
4. ⏳ Crear script de migración para subir archivos a R2
5. ⏳ Actualizar referencias en la base de datos

---

## 📝 Notas

- La estructura de carpetas original se ha preservado
- Todos los metadatos de los archivos se han mantenido
- Los archivos descargados están listos para ser migrados a Cloudflare R2
- Total de espacio necesario en R2: ~210 MB (incluyendo overhead)

---

## 🔐 Seguridad

- ⚠️ **IMPORTANTE:** El archivo `.env` contiene credenciales sensibles
- No compartir el contenido de `firebase-backup/` públicamente
- Las credenciales de Firebase Admin tienen acceso completo al bucket
