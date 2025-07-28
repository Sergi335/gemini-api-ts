import mongoose from 'mongoose'

export const dbConnect = async (): Promise<void> => {
  // Configurar strictQuery para evitar el warning de deprecación
  mongoose.set('strictQuery', true)

  const { DB_URI, DB_URI_TEST, NODE_ENV } = process.env
  const connectionString = NODE_ENV === 'test'
    ? DB_URI_TEST
    : DB_URI

  if (connectionString === undefined) {
    // Cambia throw por reject para que sea capturable como promesa
    return await Promise.reject(new Error('No se ha definido la cadena de conexión a la base de datos'))
  }

  return await mongoose.connect(connectionString)
    .then(() => {
      console.log('***** CONEXION CORRECTA *****')
    })
    .catch((err) => {
      console.log('***** ERROR DE CONEXION *****', err)
    })
}
