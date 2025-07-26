import { Schema, model } from 'mongoose'

const CategorySchema = new Schema({
  name: {
    type: String
  },
  idParent: {
    type: String
  },
  isEmpty: {
    type: Boolean
  },
  order: {
    type: Number
  },
  user: {
    type: String
  },
  slug: {
    type: String,
    unique: true
  }
}, {
  timestamps: true,
  versionKey: false
})

export default model('category', CategorySchema)
