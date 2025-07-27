import { Schema, model } from 'mongoose'

const CategorySchema = new Schema({
  name: {
    type: String
  },
  parentId: {
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
  },
  hidden: {
    type: Boolean,
    default: false
  },
  displayName: {
    type: String
  }
}, {
  timestamps: true,
  versionKey: false
})

export default model('category', CategorySchema)
