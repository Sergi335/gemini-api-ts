import { describe, it, expect, vi, beforeEach } from 'vitest'
import users from './schemas/userSchema'
import { userModel } from './userModel'

vi.mock('./schemas/userSchema')

describe('userModel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createUser', () => {
    it('crea un usuario nuevo exitosamente', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        profileImage: 'http://example.com/image.jpg'
      }
      const mockCreatedUser = { _id: 'user123', ...userData }

      // @ts-expect-error - Mock de Mongoose
      users.findOne.mockResolvedValue(null)
      // @ts-expect-error - Mock de Mongoose
      users.create.mockResolvedValue(mockCreatedUser)

      const result = await userModel.createUser({ user: userData })

      expect(users.findOne).toHaveBeenCalledWith({ email: userData.email })
      expect(users.create).toHaveBeenCalledWith(userData)
      expect(result).toEqual(mockCreatedUser)
    })

    it('retorna error si el usuario ya existe', async () => {
      const userData = {
        email: 'existing@example.com',
        name: 'Existing User'
      }
      const existingUser = { _id: 'user123', ...userData }

      // @ts-expect-error - Mock de Mongoose
      users.findOne.mockResolvedValue(existingUser)

      const result = await userModel.createUser({ user: userData })

      expect(users.findOne).toHaveBeenCalledWith({ email: userData.email })
      expect(users.create).not.toHaveBeenCalled()
      expect(result).toEqual({ error: 'El usuario ya existe' })
    })

    it('maneja el caso cuando profileImage es opcional', async () => {
      const userData = {
        email: 'test2@example.com',
        name: 'Test User 2'
      }
      const mockCreatedUser = { _id: 'user124', ...userData }

      // @ts-expect-error - Mock de Mongoose
      users.findOne.mockResolvedValue(null)
      // @ts-expect-error - Mock de Mongoose
      users.create.mockResolvedValue(mockCreatedUser)

      const result = await userModel.createUser({ user: userData })

      expect(result).toEqual(mockCreatedUser)
    })
  })

  describe('getUser', () => {
    it('retorna el usuario cuando existe', async () => {
      const email = 'test@example.com'
      const mockUser = {
        _id: 'user123',
        email,
        name: 'Test User',
        profileImage: 'http://example.com/image.jpg'
      }

      // @ts-expect-error - Mock de Mongoose
      users.findOne.mockResolvedValue(mockUser)

      const result = await userModel.getUser({ email })

      expect(users.findOne).toHaveBeenCalledWith({ email })
      expect(result).toEqual(mockUser)
    })

    it('retorna error cuando el usuario no existe', async () => {
      const email = 'nonexistent@example.com'

      // @ts-expect-error - Mock de Mongoose
      users.findOne.mockResolvedValue(null)

      const result = await userModel.getUser({ email })

      expect(users.findOne).toHaveBeenCalledWith({ email })
      expect(result).toEqual({ error: 'El usuario no existe' })
    })
  })

  describe('editUser', () => {
    it('actualiza el usuario exitosamente', async () => {
      const email = 'test@example.com'
      const updateData = {
        name: 'Updated Name',
        website: 'https://example.com'
      }
      const mockUpdatedUser = {
        _id: 'user123',
        email,
        ...updateData
      }

      // @ts-expect-error - Mock de Mongoose
      users.findOneAndUpdate.mockResolvedValue(mockUpdatedUser)

      const result = await userModel.editUser({ email, user: updateData })

      expect(users.findOneAndUpdate).toHaveBeenCalledWith(
        { email },
        updateData,
        { new: true }
      )
      expect(result).toEqual(mockUpdatedUser)
    })

    it('retorna error cuando el usuario no existe', async () => {
      const email = 'nonexistent@example.com'
      const updateData = { name: 'New Name' }

      // @ts-expect-error - Mock de Mongoose
      users.findOneAndUpdate.mockResolvedValue(null)

      const result = await userModel.editUser({ email, user: updateData })

      expect(users.findOneAndUpdate).toHaveBeenCalledWith(
        { email },
        updateData,
        { new: true }
      )
      expect(result).toEqual({ error: 'El usuario no existe' })
    })

    it('maneja actualizaciones con datos complejos', async () => {
      const email = 'test@example.com'
      const updateData = {
        name: 'Complex Update',
        profileImage: 'new-image.jpg',
        website: 'https://newsite.com',
        newUser: false
      }
      const mockUpdatedUser = {
        _id: 'user123',
        email,
        ...updateData
      }

      // @ts-expect-error - Mock de Mongoose
      users.findOneAndUpdate.mockResolvedValue(mockUpdatedUser)

      const result = await userModel.editUser({ email, user: updateData })

      expect(result).toEqual(mockUpdatedUser)
    })
  })

  describe('deleteUser', () => {
    it('elimina el usuario exitosamente', async () => {
      const email = 'test@example.com'
      const mockDeleteResult = { deletedCount: 1 }

      // @ts-expect-error - Mock de Mongoose
      users.deleteOne.mockResolvedValue(mockDeleteResult)

      const result = await userModel.deleteUser({ email })

      expect(users.deleteOne).toHaveBeenCalledWith({ email })
      expect(result).toEqual({ status: 'Usuario eliminado correctamente' })
    })

    it('retorna error cuando el usuario no existe', async () => {
      const email = 'nonexistent@example.com'
      const mockDeleteResult = { deletedCount: 0 }

      // @ts-expect-error - Mock de Mongoose
      users.deleteOne.mockResolvedValue(mockDeleteResult)

      const result = await userModel.deleteUser({ email })

      expect(users.deleteOne).toHaveBeenCalledWith({ email })
      expect(result).toEqual({ error: 'Usuario no encontrado' })
    })

    it('maneja deletedCount undefined', async () => {
      const email = 'test@example.com'
      const mockDeleteResult = { deletedCount: undefined }

      // @ts-expect-error - Mock de Mongoose
      users.deleteOne.mockResolvedValue(mockDeleteResult)

      const result = await userModel.deleteUser({ email })

      expect(result).toEqual({ error: 'Usuario no encontrado' })
    })

    it('maneja deletedCount null', async () => {
      const email = 'test@example.com'
      const mockDeleteResult = { deletedCount: null }

      // @ts-expect-error - Mock de Mongoose
      users.deleteOne.mockResolvedValue(mockDeleteResult)

      const result = await userModel.deleteUser({ email })

      expect(result).toEqual({ error: 'Usuario no encontrado' })
    })
  })

  describe('updateProfileImage', () => {
    it('actualiza la imagen de perfil exitosamente', async () => {
      const url = 'https://example.com/new-image.jpg'
      const userEmail = 'test@example.com'
      const mockUpdatedUser = {
        _id: 'user123',
        email: userEmail,
        profileImage: url
      }

      // @ts-expect-error - Mock de Mongoose
      users.findOneAndUpdate.mockResolvedValue(mockUpdatedUser)

      const result = await userModel.updateProfileImage({ url, user: userEmail })

      expect(users.findOneAndUpdate).toHaveBeenCalledWith(
        { email: userEmail },
        { profileImage: url },
        { new: true }
      )
      expect(result).toEqual({ message: 'Usuario encontrado y actualizado' })
    })

    it('retorna error cuando el usuario no existe', async () => {
      const url = 'https://example.com/image.jpg'
      const userEmail = 'nonexistent@example.com'

      // @ts-expect-error - Mock de Mongoose
      users.findOneAndUpdate.mockResolvedValue(null)

      const result = await userModel.updateProfileImage({ url, user: userEmail })

      expect(users.findOneAndUpdate).toHaveBeenCalledWith(
        { email: userEmail },
        { profileImage: url },
        { new: true }
      )
      expect(result).toEqual({ error: 'Usuario no encontrado' })
    })

    it('retorna error cuando el usuario no tiene _id', async () => {
      const url = 'https://example.com/image.jpg'
      const userEmail = 'test@example.com'
      const mockUpdatedUser = {
        email: userEmail,
        profileImage: url
        // _id es undefined/null
      }

      // @ts-expect-error - Mock de Mongoose
      users.findOneAndUpdate.mockResolvedValue(mockUpdatedUser)

      const result = await userModel.updateProfileImage({ url, user: userEmail })

      expect(result).toEqual({ error: 'Usuario no encontrado' })
    })

    it('maneja URLs de diferentes formatos', async () => {
      const testCases = [
        'https://cdn.example.com/images/user123.png',
        '/uploads/profile-images/image.jpg',
        'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...'
      ]

      for (const url of testCases) {
        const userEmail = 'test@example.com'
        const mockUpdatedUser = {
          _id: 'user123',
          email: userEmail,
          profileImage: url
        }

        // @ts-expect-error - Mock de Mongoose
        users.findOneAndUpdate.mockResolvedValue(mockUpdatedUser)

        const result = await userModel.updateProfileImage({ url, user: userEmail })

        expect(result).toEqual({ message: 'Usuario encontrado y actualizado' })
      }
    })
  })

  describe('Casos de error de base de datos', () => {
    it('maneja errores de conexión en createUser', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User'
      }

      // @ts-expect-error - Mock de Mongoose
      users.findOne.mockRejectedValue(new Error('Database connection error'))

      await expect(userModel.createUser({ user: userData })).rejects.toThrow('Database connection error')
    })

    it('maneja errores de conexión en getUser', async () => {
      const email = 'test@example.com'

      // @ts-expect-error - Mock de Mongoose
      users.findOne.mockRejectedValue(new Error('Database connection error'))

      await expect(userModel.getUser({ email })).rejects.toThrow('Database connection error')
    })

    it('maneja errores de conexión en editUser', async () => {
      const email = 'test@example.com'
      const updateData = { name: 'New Name' }

      // @ts-expect-error - Mock de Mongoose
      users.findOneAndUpdate.mockRejectedValue(new Error('Database connection error'))

      await expect(userModel.editUser({ email, user: updateData })).rejects.toThrow('Database connection error')
    })

    it('maneja errores de conexión en deleteUser', async () => {
      const email = 'test@example.com'

      // @ts-expect-error - Mock de Mongoose
      users.deleteOne.mockRejectedValue(new Error('Database connection error'))

      await expect(userModel.deleteUser({ email })).rejects.toThrow('Database connection error')
    })

    it('maneja errores de conexión en updateProfileImage', async () => {
      const url = 'https://example.com/image.jpg'
      const userEmail = 'test@example.com'

      // @ts-expect-error - Mock de Mongoose
      users.findOneAndUpdate.mockRejectedValue(new Error('Database connection error'))

      await expect(userModel.updateProfileImage({ url, user: userEmail })).rejects.toThrow('Database connection error')
    })
  })
})
