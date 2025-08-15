export interface User {
  readonly _id?: string
  email: string
  name?: string
  quota?: number
  profileImage?: string
  realName?: string
  newUser?: boolean
  signMethod?: string
  googleId?: string
  webSite?: string
  aboutMe?: string
  lastBackupUrl?: string
  // add other user properties if needed
}

export interface UserUpdateFields {
  email: string
  fields: Partial<User>
}
