import admin, { ServiceAccount } from 'firebase-admin'
import { initializeApp } from 'firebase/app'
import { getStorage } from 'firebase/storage'
import { getEnvOrThrow, getPrivateKeyOrThrow } from './env'

export const initializeFirebase = (): import('firebase/app').FirebaseApp => {
  // Inicializar Firebase Admin para autenticación
  const serviceAccount: ServiceAccount = {
    type: getEnvOrThrow('FBADMIN_TYPE'),
    project_id: getEnvOrThrow('FBADMIN_PROJECT_ID'),
    private_key_id: getEnvOrThrow('FBADMIN_PRIVATE_KEY_ID'),
    private_key: getPrivateKeyOrThrow(),
    client_email: getEnvOrThrow('FBADMIN_CLIENT_EMAIL'),
    client_id: getEnvOrThrow('FBADMIN_CLIENT_ID'),
    auth_uri: getEnvOrThrow('FBADMIN_AUTH_URI'),
    token_uri: getEnvOrThrow('FBADMIN_TOKEN_URI'),
    auth_provider_x509_cert_url: getEnvOrThrow('FBADMIN_AUTH_PROV_509'),
    client_x509_cert_url: getEnvOrThrow('FBADMIN_CLIENT_509'),
    universe_domain: getEnvOrThrow('FBADMIN_UNIVERSE_DOM')
  } as any

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  })

  // Inicializar Firebase Client para storage
  const firebaseConfig = {
    apiKey: getEnvOrThrow('FB_API_KEY'),
    authDomain: getEnvOrThrow('FB_AUTH_DOMAIN'),
    projectId: getEnvOrThrow('FB_PROJECT_ID'),
    storageBucket: getEnvOrThrow('FB_STORAGE_BUCKET'),
    messagingSenderId: getEnvOrThrow('FB_MESSAGING_ID')
    // appId: getEnvOrThrow('FB_APP_ID')
  }

  return initializeApp(firebaseConfig)
}

// Inicializar Firebase una sola vez
export const firebaseApp = initializeFirebase()

// Exportar storage ya configurado
export const firebaseStorage = getStorage(firebaseApp)
