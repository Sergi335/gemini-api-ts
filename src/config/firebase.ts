import admin, { ServiceAccount } from 'firebase-admin'
import { getEnvOrThrow, getPrivateKeyOrThrow } from './env'

export const initializeFirebase = (): void => {
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
}
