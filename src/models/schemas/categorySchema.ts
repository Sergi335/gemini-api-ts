import { Schema, model } from 'mongoose'

const CategorySchema = new Schema({
  name: {
    type: String
  },
  parentId: {
    type: Schema.Types.ObjectId
  },
  isEmpty: {
    type: Boolean
  },
  order: {
    type: Number
  },
  user: {
    type: Schema.Types.ObjectId,
    index: true
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
