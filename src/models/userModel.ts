import users from './schemas/userSchema'
import mongoose from 'mongoose'

/* eslint-disable @typescript-eslint/no-extraneous-class */
export class userModel {
  static async createUser ({ user }: { user: { email: string, name: string, profileImage?: string } }): Promise<mongoose.Document | { error: string }> {
    // Buscar email en la base de datos y si existe devolver error
    const isNewUser = await users.findOne({ email: user.email })
    if (isNewUser !== null) return { error: 'El usuario ya existe' }
    const data = await users.create(user)
    return data
  }

  static async getUser ({ email }: { email: string }): Promise<mongoose.Document | { error: string }> {
    const data = await users.findOne({ email })
    if (data !== null) {
      return data
    } else {
      return { error: 'El usuario no existe' }
    }
  }

  static async editUser ({ email, user }: { email: string, user: any }): Promise<mongoose.Document | { error: string }> {
    const data = await users.findOneAndUpdate({ email }, user, { new: true })
    if (data !== null) {
      return data
    } else {
      return { error: 'El usuario no existe' }
    }
  }

  static async deleteUser ({ email }: { email: string }): Promise<{ status: string } | { error: string }> {
    const result = await users.deleteOne({ email })
    if (typeof result.deletedCount === 'number' && result.deletedCount > 0) {
      return { status: 'Usuario eliminado correctamente' }
    } else {
      return { error: 'Usuario no encontrado' }
    }
  }

  static async updateProfileImage ({ url, user }: { url: string, user: string }): Promise<{ message: string } | { error: string }> {
    const imagePath = url
    const update = await users.findOneAndUpdate(
      { email: user },
      { profileImage: imagePath },
      { new: true }
    )
    if (update?._id != null) {
      console.log('🚀 ~ file: userModel.js:39 ~ userModel ~ updateProfileImage ~ update:', update)
      // Usuario encontrado y actualizado correctamente
      console.log('Usuario encontrado y actualizado:', user)
      return { message: 'Usuario encontrado y actualizado' }
    } else {
      // No se encontró el usuario
      console.log('Usuario no encontrado')
      return { error: 'Usuario no encontrado' }
      // Maneja el caso de usuario no encontrado de alguna manera apropiada
    }
  }
}
