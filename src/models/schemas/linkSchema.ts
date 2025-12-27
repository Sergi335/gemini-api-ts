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
  type: {
    type: String,
    enum: ['video', 'article', 'general'],
    default: 'general'
  },
  categoryName: {
    type: String
  },
  categoryId: {
    type: Schema.Types.ObjectId
  },
  order: {
    type: Number
  },
  user: {
    type: Schema.Types.ObjectId,
    index: true
  },
  notes: {
    type: Object
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
  },
  extractedArticle: {
    type: Object,
    required: false
  }
}, {
  timestamps: true,
  versionKey: false
})

LinkSchema.index({ user: 1, categoryId: 1 })
LinkSchema.index({ user: 1, url: 1 })

export default model('link', LinkSchema)
