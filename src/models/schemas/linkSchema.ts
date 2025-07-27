import { Schema, model } from 'mongoose'

const LinkSchema = new Schema({
  name: {
    type: String
  },
  description: {
    type: String,
    default: 'Description'
  },
  url: {
    type: String
  },
  imgUrl: {
    type: String
  },
  categoryName: {
    type: String
  },
  categoryId: {
    type: String
  },
  order: {
    type: Number
  },
  user: {
    type: String
  },
  notes: {
    type: String
  },
  images: {
    type: Array
  },
  bookmark: {
    type: Boolean,
    default: false
  },
  bookmarkOrder: {
    type: Number,
    default: 0
  },
  readlist: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  versionKey: false
})

export default model('link', LinkSchema)
