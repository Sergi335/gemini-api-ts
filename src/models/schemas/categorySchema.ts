import { Schema, model } from 'mongoose'

const CategorySchema = new Schema({
  name: {
    type: String
  },
  parentId: {
    type: Schema.Types.ObjectId
    // ref: 'category' // opcional, para population
  },
  isEmpty: {
    type: Boolean
  },
  order: {
    type: Number
  },
  user: {
    type: Schema.Types.ObjectId // Cambiar a ObjectId
    // ref: 'User' // opcional, para population
  },
  slug: {
    type: String,
    unique: true
  },
  parentSlug: {
    type: String
  },
  hidden: {
    type: Boolean,
    default: false
  },
  displayName: {
    type: String
  },
  level: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  versionKey: false
})

export default model('category', CategorySchema)
