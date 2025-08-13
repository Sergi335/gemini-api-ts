interface ConstantsType {
  API_SUCCESS_MESSAGE: string
  API_SUCCESS_RESPONSE: {
    success: boolean
    data: any
    error: any
    message: string
  }
  API_FAIL_MESSAGE: string
  API_NOT_USER_MESSAGE: string
  API_FAIL_RESPONSE: {
    success: boolean
    data: any
    error: any
    message: string
  }
}

export const API_SUCCESS_MESSAGE = 'Operación exitosa'
export const API_FAIL_MESSAGE = 'Operación fallida'
export const API_NOT_USER_MESSAGE = 'No se recibió el identificador de usuario'

export const constants: ConstantsType = {
  API_SUCCESS_MESSAGE,
  API_SUCCESS_RESPONSE: {
    success: true,
    data: null,
    error: null,
    message: API_SUCCESS_MESSAGE
  },
  API_FAIL_MESSAGE,
  API_NOT_USER_MESSAGE,
  API_FAIL_RESPONSE: {
    success: false,
    data: null,
    error: null,
    message: API_FAIL_MESSAGE
  }
}
