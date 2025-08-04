import { Schema, model } from 'mongoose'

const CategorySchema = new Schema({
  _id: {
    type: String,
    required: true
  },
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
