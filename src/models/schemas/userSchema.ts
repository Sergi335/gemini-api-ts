import mongoose, { Schema, model } from 'mongoose'

const UsersSchema = new Schema({
  _id: {
    type: mongoose.Types.ObjectId
  },
  name: {
    type: String
  },
  realName: {
    type: String
  },
  email: {
    type: String,
    unique: true,
    index: true
  },
  password: {
    type: String
  },
  newUser: {
    type: Boolean
  },
  profileImage: {
    type: String
  },
  signMethod: {
    type: String
  },
  googleId: {
    type: String
  },
  website: {
    type: String
  },
  aboutMe: {
    type: String
  },
  lastBackupUrl: {
    type: String
  },
  quota: {
    type: Number
  }
}, {
  timestamps: true,
  versionKey: false
})

export default model('users', UsersSchema)
