import mongoose from 'mongoose'
import { User, UserUpdateFields } from '../types/userModel.types'
import category from './schemas/categorySchema'
import link from './schemas/linkSchema'
import users from './schemas/userSchema'
// import { createRequire } from 'node:module'
// const customRequire = createRequire(import.meta.url)
// const dummyData = customRequire('../utils/dummyData.json')
import dummyData from '../utils/dummyData.json'

/* eslint-disable @typescript-eslint/no-extraneous-class */
export class userModel {
  static async createUser ({ user }: { user: User }): Promise<mongoose.Document | { error: string }> {
    try {
      // Buscar email en la base de datos y si existe devolver error
      const isNewUser = await users.findOne({ email: user.email })
      if (isNewUser !== null) return { error: 'El usuario ya existe' }
      const data = await users.create(user)
      return data
    } catch (error) {
      console.error('Error al crear el usuario:', error)
      return { error: 'Error al crear el usuario' }
    }
  }

  static async getUser ({ email }: User): Promise<User | { error: string }> {
    try {
      const data = await users.findOne({ email })
      if (data !== null) {
        const userData: User = {
          _id: String(data._id),
          email: data.email ?? '',
          name: data.name ?? '',
          quota: data.quota ?? 0,
          profileImage: data.profileImage ?? '',
          realName: data.realName ?? '',
          newUser: data.newUser ?? false,
          signMethod: data.signMethod ?? '',
          googleId: data.googleId ?? '',
          webSite: data.website ?? '',
          aboutMe: data.aboutMe ?? '',
          lastBackupUrl: data.lastBackupUrl ?? ''
        }
        return userData
      } else {
        return { error: 'El usuario no existe' }
      }
    } catch (error) {
      console.error('Error al obtener el usuario:', error)
      return { error: 'Error al obtener el usuario' }
    }
  }

  static async editUser ({ email, fields }: UserUpdateFields): Promise<mongoose.Document | { error: string }> {
    try {
      const data = await users.findOneAndUpdate({ email }, fields, { new: true })
      console.log('🚀 ~ userModel ~ editUser ~ data:', data)
      if (data !== null) {
        return data
      } else {
        return { error: 'El usuario no existe' }
      }
    } catch (error) {
      console.error('Error al editar el usuario:', error)
      return { error: 'Error al editar el usuario' }
    }
  }

  static async deleteUser ({ email }: User): Promise<{ status: string } | { error: string }> {
    try {
      const result = await users.deleteOne({ email })
      if (typeof result.deletedCount === 'number' && result.deletedCount > 0) {
        return { status: 'Usuario eliminado correctamente' }
      } else {
        return { error: 'Usuario no encontrado' }
      }
    } catch (error) {
      console.error('Error al eliminar el usuario:', error)
      return { error: 'Error al eliminar el usuario' }
    }
  }

  static async updateProfileImage ({ profileImage, email }: User): Promise<{ message: string } | { error: string }> {
    try {
      const update = await users.findOneAndUpdate(
        { email },
        { profileImage },
        { new: true }
      )
      if (update?._id != null) {
        console.log('🚀 ~ file: userModel.js:39 ~ userModel ~ updateProfileImage ~ update:', update)
        // Usuario encontrado y actualizado correctamente
        console.log('Usuario encontrado y actualizado:', update)
        return { message: 'Usuario encontrado y actualizado' }
      } else {
      // No se encontró el usuario
        console.log('Usuario no encontrado')
        return { error: 'Usuario no encontrado' }
      // Maneja el caso de usuario no encontrado de alguna manera apropiada
      }
    } catch (error) {
      console.error('Error al actualizar la imagen de perfil:', error)
      return { error: 'Error al actualizar la imagen de perfil' }
    }
  }

  // TODO
  static async createDummyContent ({ user }: { user: string }): Promise<{ mensaje: string } | { error: string }> {
    try {
      // Borrar los documentos existentes en las colecciones
      await category.deleteMany({ user })
      await link.deleteMany({ user })

      // Insertar los documentos de la copia de seguridad en las colecciones
      for (const col of dummyData.categories) {
        const { _id, ...rest } = col
        await category.create({ ...rest, user })
      }
      const data = await category.find({ user })
      for (const enlace of dummyData.links) {
        const column = data.find(col => col.name === enlace.categoryId)
        // console.log(id._id, enlace.name)
        if (column != null) {
          const { _id, ...rest } = enlace
          await link.create({ ...rest, idpanel: column._id.toString(), user })
          // console.log({ ...rest, idpanel: column._id.toString(), user })
        }
      }
      const mensaje = 'Copia de seguridad restaurada correctamente.'

      console.log('Copia de seguridad restaurada correctamente.')
      return ({ mensaje })
    } catch (error) {
      const mensaje = 'Error al restaurar la copia de seguridad'
      console.error('Error al restaurar la copia de seguridad:', error)
      return ({ mensaje })
    }
  }
}
