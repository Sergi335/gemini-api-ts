import { Response } from 'express'
import {
  deleteObject,
  getDownloadURL,
  getMetadata,
  listAll,
  ref,
  uploadBytes
} from 'firebase/storage'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { linkModel } from '../models/linkModel'
import { userModel } from '../models/userModel'
import { RequestWithUser } from '../types/express'
import { storageController } from './storageController'

// Mock de Firebase Storage
vi.mock('firebase/storage', () => ({
  initializeApp: vi.fn(),
  getStorage: vi.fn(),
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
  getMetadata: vi.fn(),
  deleteObject: vi.fn(),
  listAll: vi.fn()
}))

// Mock de los modelos
vi.mock('../models/linkModel')
vi.mock('../models/userModel')

describe('storageController', () => {
  let mockRequest: Partial<RequestWithUser>
  let mockResponse: Partial<Response>

  beforeEach(() => {
    vi.clearAllMocks()

    mockRequest = {
      user: { name: 'testuser' },
      body: {},
      query: {}
    }

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis()
    }
  })

  describe('getBackgroundsMiniatures', () => {
    it('devuelve las miniaturas de fondos exitosamente', async () => {
      const mockItems = [
        { name: 'bg1.jpg' },
        { name: 'bg2.jpg' }
      ]
      const mockMetadata = { name: 'bg1.jpg' }
      const mockUrl = 'https://storage.googleapis.com/test/bg1.jpg'

      vi.mocked(ref).mockReturnValue({} as any)
      vi.mocked(listAll).mockResolvedValue({ items: mockItems } as any)
      vi.mocked(getMetadata).mockResolvedValue(mockMetadata as any)
      vi.mocked(getDownloadURL).mockResolvedValue(mockUrl)

      await storageController.getBackgroundsMiniatures(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(mockResponse.send).toHaveBeenCalledWith({
        backgrounds: expect.arrayContaining([
          expect.objectContaining({
            url: mockUrl,
            nombre: 'bg1.jpg'
          })
        ])
      })
    })

    it('maneja errores al leer la carpeta', async () => {
      const error = new Error('Storage error')
      vi.mocked(listAll).mockRejectedValue(error)

      await storageController.getBackgroundsMiniatures(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(mockResponse.send).toHaveBeenCalledWith(error)
    })
  })

  describe('uploadImage', () => {
    const mockFile = {
      fieldname: 'image',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('test'),
      size: 1024,
      destination: '',
      filename: '',
      path: '',
      stream: {} as any
    }

    beforeEach(() => {
      mockRequest.file = mockFile
      mockRequest.body = { linkId: 'link123' }
    })

    it('sube una imagen exitosamente', async () => {
      const mockDownloadURL = 'https://storage.googleapis.com/test/image.jpg'
      const mockSnapshot = { ref: {} }
      const mockResult = { _id: 'link123', images: [mockDownloadURL] }

      vi.mocked(ref).mockReturnValue({} as any)
      vi.mocked(uploadBytes).mockResolvedValue(mockSnapshot as any)
      vi.mocked(getDownloadURL).mockResolvedValue(mockDownloadURL)
      vi.mocked(linkModel.setImagesInDb).mockResolvedValue(mockResult as any)

      await storageController.uploadImage(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(uploadBytes).toHaveBeenCalled()
      expect(linkModel.setImagesInDb).toHaveBeenCalledWith({
        url: mockDownloadURL,
        user: 'testuser',
        linkId: 'link123'
      })
      expect(mockResponse.send).toHaveBeenCalledWith({
        status: 'success',
        link: mockResult
      })
    })

    it('devuelve error cuando no hay archivo', async () => {
      mockRequest.file = undefined

      await storageController.uploadImage(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(mockResponse.send).toHaveBeenCalledWith({
        error: 'No hemos recibido imagen'
      })
    })

    it('devuelve error cuando el usuario no está autenticado', async () => {
      mockRequest.user = undefined

      await storageController.uploadImage(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Usuario no autenticado'
      })
    })

    it('maneja errores durante la subida', async () => {
      const error = new Error('Upload error')
      vi.mocked(uploadBytes).mockRejectedValue(error)

      await storageController.uploadImage(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.send).toHaveBeenCalledWith({
        error: 'Error al subir el archivo'
      })
    })
  })

  describe('deleteImage', () => {
    beforeEach(() => {
      mockRequest.body = {
        id: 'link123',
        image: 'testuser/images/linkImages/test.jpg'
      }
    })

    it('elimina una imagen exitosamente', async () => {
      const mockUser = { quota: 5000 }
      const mockMetadata = { size: 1024 }

      vi.mocked(ref).mockReturnValue({} as any)
      vi.mocked(getMetadata).mockResolvedValue(mockMetadata as any)
      vi.mocked(deleteObject).mockResolvedValue()
      vi.mocked(userModel.getUser).mockResolvedValue(mockUser as any)
      vi.mocked(userModel.editUser).mockResolvedValue({} as any)
      vi.mocked(linkModel.deleteImageOnDb).mockResolvedValue({} as any)

      await storageController.deleteImage(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(deleteObject).toHaveBeenCalled()
      expect(userModel.editUser).toHaveBeenCalledWith({
        email: 'testuser',
        user: { quota: 3976 } // 5000 - 1024
      })
      expect(linkModel.deleteImageOnDb).toHaveBeenCalledWith({
        url: 'testuser/images/linkImages/test.jpg',
        user: 'testuser',
        linkId: 'link123'
      })
      expect(mockResponse.send).toHaveBeenCalledWith({
        message: 'Imagen eliminada exitosamente'
      })
    })

    it('devuelve error cuando no hay URL de imagen', async () => {
      mockRequest.body.image = undefined

      await storageController.deleteImage(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(mockResponse.send).toHaveBeenCalledWith({
        error: 'No hemor recibido la imagen en la petición'
      })
    })

    it('maneja errores de storage', async () => {
      const error = { code: 'storage/object-not-found' }
      vi.mocked(getMetadata).mockRejectedValue(error)

      await storageController.deleteImage(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.send).toHaveBeenCalledWith({
        error: 'storage/object-not-found'
      })
    })
  })

  describe('uploadIcon', () => {
    const mockFile = {
      fieldname: 'icon',
      originalname: 'icon.png',
      encoding: '7bit',
      mimetype: 'image/png',
      buffer: Buffer.from('test'),
      size: 512,
      destination: '',
      filename: '',
      path: '',
      stream: {} as any
    }

    beforeEach(() => {
      mockRequest.file = mockFile
      mockRequest.body = { linkId: 'link123' }
    })

    it('sube un icono exitosamente', async () => {
      const mockDownloadURL = 'https://storage.googleapis.com/test/icon.png'
      const mockSnapshot = { ref: {} }

      vi.mocked(ref).mockReturnValue({} as any)
      vi.mocked(uploadBytes).mockResolvedValue(mockSnapshot as any)
      vi.mocked(getDownloadURL).mockResolvedValue(mockDownloadURL)
      vi.mocked(linkModel.setLinkImgInDb).mockResolvedValue({} as any)

      await storageController.uploadIcon(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(linkModel.setLinkImgInDb).toHaveBeenCalledWith({
        url: mockDownloadURL,
        user: 'testuser',
        linkId: 'link123'
      })
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '¡Archivo o blob subido!',
          url: mockDownloadURL
        })
      )
    })

    it('maneja iconos predefinidos cuando no hay archivo', async () => {
      mockRequest.file = undefined
      mockRequest.body.filePath = '/default/icon.png'

      vi.mocked(linkModel.setLinkImgInDb).mockResolvedValue({} as any)

      await storageController.uploadIcon(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(linkModel.setLinkImgInDb).toHaveBeenCalledWith({
        url: '/default/icon.png',
        user: 'testuser',
        linkId: 'link123'
      })
    })
  })

  describe('uploadProfileImage', () => {
    const mockFile = {
      fieldname: 'profile',
      originalname: 'profile.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('test'),
      size: 2048,
      destination: '',
      filename: '',
      path: '',
      stream: {} as any
    }

    beforeEach(() => {
      mockRequest.file = mockFile
      process.env.MAX_USER_QUOTA = '10000'
    })

    it('sube imagen de perfil exitosamente (primera vez)', async () => {
      const mockDownloadURL = 'https://storage.googleapis.com/test/profile.jpg'
      const mockSnapshot = { ref: {}, metadata: { size: 2048 } }
      const mockUser = { quota: undefined }

      vi.mocked(ref).mockReturnValue({} as any)
      vi.mocked(listAll).mockResolvedValue({ items: [] } as any)
      vi.mocked(uploadBytes).mockResolvedValue(mockSnapshot as any)
      vi.mocked(getDownloadURL).mockResolvedValue(mockDownloadURL)
      vi.mocked(userModel.getUser).mockResolvedValue(mockUser as any)
      vi.mocked(userModel.editUser).mockResolvedValue({} as any)
      vi.mocked(userModel.updateProfileImage).mockResolvedValue({} as any)

      await storageController.uploadProfileImage(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(userModel.editUser).toHaveBeenCalledWith({
        email: 'testuser',
        user: { quota: 2048 }
      })
      expect(userModel.updateProfileImage).toHaveBeenCalledWith({
        url: mockDownloadURL,
        user: 'testuser'
      })
      expect(mockResponse.send).toHaveBeenCalledWith({
        message: '¡Archivo o blob subido!',
        url: mockDownloadURL
      })
    })

    it('reemplaza imagen existente correctamente', async () => {
      const mockDownloadURL = 'https://storage.googleapis.com/test/profile.jpg'
      const mockSnapshot = { ref: {}, metadata: { size: 2048 } }
      const mockUser = { quota: 5000 }
      const mockExistingItem = {}
      const mockOldMetadata = { size: 1024 }

      vi.mocked(ref).mockReturnValue({} as any)
      vi.mocked(listAll).mockResolvedValue({ items: [mockExistingItem] } as any)
      vi.mocked(getMetadata).mockResolvedValue(mockOldMetadata as any)
      vi.mocked(deleteObject).mockResolvedValue()
      vi.mocked(uploadBytes).mockResolvedValue(mockSnapshot as any)
      vi.mocked(getDownloadURL).mockResolvedValue(mockDownloadURL)
      vi.mocked(userModel.getUser).mockResolvedValue(mockUser as any)
      vi.mocked(userModel.editUser).mockResolvedValue({} as any)
      vi.mocked(userModel.updateProfileImage).mockResolvedValue({} as any)

      await storageController.uploadProfileImage(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(deleteObject).toHaveBeenCalledWith(mockExistingItem)
      expect(userModel.editUser).toHaveBeenCalledWith({
        email: 'testuser',
        user: { quota: 6024 } // 5000 + (2048 - 1024)
      })
    })

    it('rechaza archivo cuando excede la cuota', async () => {
      const mockUser = { quota: 9000 }
      const mockSnapshot = { ref: {}, metadata: { size: 2048 } }

      vi.mocked(listAll).mockResolvedValue({ items: [] } as any)
      vi.mocked(uploadBytes).mockResolvedValue(mockSnapshot as any)
      vi.mocked(userModel.getUser).mockResolvedValue(mockUser as any)

      await storageController.uploadProfileImage(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(mockResponse.send).toHaveBeenCalledWith({
        error: 'No tienes espacio suficiente'
      })
    })

    it('devuelve error cuando no hay archivo', async () => {
      mockRequest.file = undefined

      await storageController.uploadProfileImage(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.send).toHaveBeenCalledWith({
        error: 'No se proporcionó ningún archivo'
      })
    })
  })

  describe('deleteIcon', () => {
    beforeEach(() => {
      mockRequest.body = { image: 'test-icon.png' }
    })

    it('elimina un icono exitosamente', async () => {
      const mockUser = { quota: 5000 }
      const mockMetadata = { size: 512 }

      vi.mocked(ref).mockReturnValue({} as any)
      vi.mocked(getMetadata).mockResolvedValue(mockMetadata as any)
      vi.mocked(userModel.getUser).mockResolvedValue(mockUser as any)
      vi.mocked(userModel.editUser).mockResolvedValue({} as any)
      vi.mocked(deleteObject).mockResolvedValue()

      await storageController.deleteIcon(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(deleteObject).toHaveBeenCalled()
      expect(userModel.editUser).toHaveBeenCalledWith({
        email: 'testuser',
        user: { quota: 4488 } // 5000 - 512
      })
      expect(mockResponse.send).toHaveBeenCalledWith({
        message: 'Imagen eliminada exitosamente'
      })
    })

    it('maneja errores durante la eliminación', async () => {
      const error = { code: 'storage/object-not-found' }
      vi.mocked(getMetadata).mockRejectedValue(error)

      await storageController.deleteIcon(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.send).toHaveBeenCalledWith({
        error: 'storage/object-not-found'
      })
    })
  })

  describe('getLinkIcons', () => {
    it('devuelve iconos por defecto y del usuario', async () => {
      const mockDefaultItems = [{ name: 'default1.png' }, { name: 'default2.png' }]
      const mockUserItems = [{ name: 'user1.png' }]
      const mockMetadata = { name: 'test.png' }
      const mockUrl = 'https://storage.googleapis.com/test.png'

      // Asegurarse de que ref se mockea correctamente para cada llamada
      const defaultRef = { fullPath: 'default/icons' }
      const userRef = { fullPath: 'testuser/icons' }
      vi.mocked(ref).mockImplementation((storage, path) => {
        if (typeof path === 'string' && path.includes('default')) return defaultRef as any
        return userRef as any
      })

      // Mockear listAll para que devuelva diferentes items según la referencia
      vi.mocked(listAll).mockImplementation(async (refValue) => {
        if (refValue.fullPath.includes('default')) {
          return { items: mockDefaultItems } as any
        }
        return { items: mockUserItems } as any
      })

      vi.mocked(getMetadata).mockResolvedValue(mockMetadata as any)
      vi.mocked(getDownloadURL).mockResolvedValue(mockUrl)

      await storageController.getLinkIcons(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      // Verificar que se llamó a listAll dos veces
      expect(listAll).toHaveBeenCalledTimes(2)

      // Verificar el contenido de la respuesta
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            url: mockUrl,
            nombre: 'test.png',
            clase: 'default'
          }),
          expect.objectContaining({
            url: mockUrl,
            nombre: 'test.png',
            clase: 'user'
          })
        ])
      )
    })
  })

  describe('deleteAllUserFiles', () => {
    it('elimina todos los archivos del usuario exitosamente', async () => {
      const mockItems = [{ name: 'file1.jpg' }, { name: 'file2.png' }]
      const folders = ['images/backgrounds', 'images/linkImages', 'images/profileImages', 'icons', 'backups']

      // Mock listAll para que devuelva items para cada carpeta
      vi.mocked(listAll).mockResolvedValue({ items: mockItems } as any)
      vi.mocked(deleteObject).mockResolvedValue()

      const result = await storageController.deleteAllUserFiles({ user: 'testuser' })

      expect(result).toEqual({
        message: 'Todos los archivos del usuario han sido eliminados'
      })
      // Se llama a listAll para cada carpeta
      expect(listAll).toHaveBeenCalledTimes(folders.length)
      // Se llama a deleteObject para cada archivo en cada carpeta
      expect(deleteObject).toHaveBeenCalledTimes(mockItems.length * folders.length)
    })

    it('maneja errores durante la eliminación', async () => {
      const error = new Error('Delete error')
      vi.mocked(listAll).mockRejectedValue(error)

      const result = await storageController.deleteAllUserFiles({ user: 'testuser' })

      expect(result).toBe(error)
    })
  })

  describe('getUserBackup', () => {
    it('devuelve URL de descarga del backup', async () => {
      const mockUrl = 'https://storage.googleapis.com/backup.json'

      vi.mocked(ref).mockReturnValue({} as any)
      vi.mocked(getDownloadURL).mockResolvedValue(mockUrl)

      await storageController.getUserBackup(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(mockResponse.send).toHaveBeenCalledWith({
        downloadUrl: mockUrl
      })
    })
  })

  describe('getBackgroundUrl', () => {
    it('devuelve URL del fondo solicitado', async () => {
      mockRequest.query = { nombre: 'background1.jpg' }
      const mockUrl = 'https://storage.googleapis.com/background1.jpg'

      vi.mocked(ref).mockReturnValue({} as any)
      vi.mocked(getDownloadURL).mockResolvedValue(mockUrl)

      await storageController.getBackgroundUrl(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(mockResponse.send).toHaveBeenCalledWith(mockUrl)
    })

    it('maneja errores al obtener URL', async () => {
      const error = new Error('Background not found')
      mockRequest.query = { nombre: 'nonexistent.jpg' }

      vi.mocked(getDownloadURL).mockRejectedValue(error)

      await storageController.getBackgroundUrl(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(mockResponse.send).toHaveBeenCalledWith(error)
    })
  })

  // Tests para métodos que están comentados/no implementados
  describe('createUserBackup', () => {
    it('devuelve error de funcionalidad no implementada', async () => {
      await storageController.createUserBackup(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(mockResponse.status).toHaveBeenCalledWith(501)
      expect(mockResponse.send).toHaveBeenCalledWith({
        error: 'Funcionalidad no implementada - faltan modelos desktopModel y columnModel'
      })
    })
  })

  describe('restoreUserBackup', () => {
    it('devuelve error de funcionalidad no implementada', async () => {
      mockRequest.file = {
        fieldname: 'backup',
        originalname: 'backup.json',
        encoding: '7bit',
        mimetype: 'application/json',
        buffer: Buffer.from('{}'),
        size: 100,
        destination: '',
        filename: '',
        path: '',
        stream: {} as any
      }

      await storageController.restoreUserBackup(
        mockRequest as RequestWithUser,
        mockResponse as Response
      )

      expect(mockResponse.status).toHaveBeenCalledWith(501)
      expect(mockResponse.send).toHaveBeenCalledWith({
        error: 'Funcionalidad no implementada - faltan esquemas escritorio y columna'
      })
    })
  })

  // Tests para validaciones de autenticación
  describe('Authentication checks', () => {
    const methods = [
      'uploadImage',
      'deleteImage',
      'uploadIcon',
      'deleteIcon',
      'getLinkIcons',
      'getUserBackup',
      'uploadProfileImage',
      'createUserBackup',
      'restoreUserBackup'
    ]

    methods.forEach(methodName => {
      it(`${methodName} devuelve error cuando el usuario no está autenticado`, async () => {
        mockRequest.user = undefined
        const method = storageController[methodName as keyof typeof storageController] as any

        await method(mockRequest as RequestWithUser, mockResponse as Response)

        expect(mockResponse.status).toHaveBeenCalledWith(401)

        if (methodName === 'deleteIcon') {
          expect(mockResponse.send).toHaveBeenCalledWith('Error usuario no proporcionado')
        } else {
          // Verificar que se llamó json con el mensaje correcto
          const jsonCalls = (mockResponse.json as ReturnType<typeof vi.fn>)?.mock?.calls
          if (Array.isArray(jsonCalls) && jsonCalls.length > 0) {
            expect(jsonCalls[0][0]).toMatchObject({
              status: 'fail',
              message: 'Usuario no autenticado'
            })
          }
        }
      })
    })
  })
})
