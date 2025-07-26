import mongoose from 'mongoose'
import category from './schemas/categorySchema'

/* eslint-disable @typescript-eslint/no-extraneous-class */
export class columnModel {
  static async getAllCategories ({ user }: { user: string }): Promise<mongoose.Document[]> {
    const data = await category.find({ user }).sort({ order: 1 })
    return data
  }
}
