import mongoose from 'mongoose'
import { User, UserUpdateFields } from '../types/userModel.types'
import category from './schemas/categorySchema'
import link from './schemas/linkSchema'
import users from './schemas/userSchema'
// import { createRequire } from 'node:module'
// const customRequire = createRequire(import.meta.url)
// const dummyData = customRequire('../utils/dummyData.json')
import dummyData from '../utils/data/dummyData.json'

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

  static async restoreBackup ({ email, backupData }: { email: string, backupData: any }): Promise<{ mensaje: string } | { error: string }> {
    try {
      // El parámetro 'email' es el identificador del usuario
      const userDoc = await users.findOne({ email })
      if (userDoc === null) {
        return { error: 'Usuario no encontrado' }
      }
      const userId = userDoc._id

      // Borrar los documentos existentes en las colecciones para este usuario
      await category.deleteMany({ user: userId })
      await link.deleteMany({ user: userId })

      // Mapa para relacionar los IDs antiguos con los nuevos IDs de MongoDB
      const idMap: Record<string, mongoose.Types.ObjectId> = {}

      // Insertar las categorías
      for (const cat of backupData.categories) {
        const { _id, parentId, user: oldUser, createdAt, updatedAt, ...rest } = cat

        const newParentId = (parentId !== undefined && idMap[parentId] !== undefined)
          ? idMap[parentId]
          : undefined

        const createdCategory = await category.create({
          ...rest,
          user: userId,
          parentId: newParentId,
          slug: rest.slug ?? `${String(userId)}-${String(rest.name)}-${Math.random().toString(36).substring(7)}`,
          displayName: rest.displayName ?? rest.name
        })
        idMap[_id] = createdCategory._id
      }

      // Insertar los links
      for (const enlace of backupData.links) {
        const { _id, categoryId, user: oldUser, createdAt, updatedAt, ...rest } = enlace
        const newCategoryId = idMap[categoryId]

        if (newCategoryId !== undefined) {
          await link.create({
            ...rest,
            categoryId: newCategoryId,
            user: userId
          })
        }
      }

      console.log('Copia de seguridad restaurada correctamente para:', email)
      return { mensaje: 'Copia de seguridad restaurada correctamente.' }
    } catch (error) {
      console.error('Error al restaurar la copia de seguridad:', error)
      return { error: 'Error al restaurar la copia de seguridad' }
    }
  }

  // TODO
  static async createDummyContent ({ user }: { user: string }): Promise<{ mensaje: string } | { error: string }> {
    return await this.restoreBackup({ email: user, backupData: dummyData })
  }
}
