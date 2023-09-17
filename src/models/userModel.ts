import { Document, Schema, Query, model } from 'mongoose'
import isEmail from 'validator/lib/isEmail';
import { hash, compare } from 'bcryptjs'

export enum UserRole {
    User = 'user',
    Admin = 'admin'
}

export interface IUser {
    fullName: string
    username: string
    bio: string
    role?: UserRole
    email: string
    password?: string
    passwordConfirm?: string
    passwordChangedAt?: Date
    createdAt?: Date
}

export interface UserDocument extends IUser, Document {
    correctPassword(password: string): Promise<boolean>
    hasPasswordChangedAfterJWT(JWTTimestamp: number): boolean
}

const userSchema = new Schema<UserDocument>({
    fullName: {
        type: String,
        required: [true, 'Full name is required.'],
        minlength: [3, 'Full name must be at least 3 characters long.'],
        maxlength: [20, 'Full name cannot exceed 20 characters in length.']
    },
    username: {
        type: String,
        required: [true, 'Username is required.'],
        unique: true,
        minlength: [3, 'Username must be at least 3 characters long.'],
        maxlength: [20, 'Username cannot exceed 20 characters in length.'],
        validate: {
            validator: function (this: UserDocument, val: string) {
                return /^[a-z0-9_]+$/.test(val)
            },
            message: 'Username can only contain lowercase letters, numbers, and underscores.'
        }
    },
    bio: String,
    role: {
        type: String,
        enum: Object.values(UserRole),
        select: false
    },
    email: {
        type: String,
        required: [true, 'Email is required.'],
        unique: true,
        validate: [isEmail, 'Please provide a valid email address.'],
        select: false
    },
    password: {
        type: String,
        required: [true, 'Password is required.'],
        minlength: [8, 'Password must be at least 8 characters long.'],
        select: false
    },
    passwordConfirm: {
        type: String,
        required: [true, 'Password confirmation is required.'],
        validate: {
            validator: function (this: UserDocument, val: string) {
                return val === this.password
            },
            message: 'Passwords do not match.'
        }
    },
    passwordChangedAt: {
        type: Date,
        select: false
    },
    createdAt: {
        type: Date,
        default: Date.now,
        select: false,
        immutable: true
    },
})

userSchema.pre<Query<UserDocument, UserDocument>>(/^find/, function (next) {
    this.select('-__v')
    next()
})

userSchema.pre<UserDocument>('save', async function (next) {
    if (!this.isModified('password')) return next()

    this.password = await hash(this.password!, 12)

    this.passwordConfirm = undefined
    next()
})

userSchema.pre<UserDocument>('save', function (next) {
    if (!this.isModified('password') || this.isNew) return next()

    this.passwordChangedAt = new Date(Date.now() - 1000)
    next()
})

userSchema.methods.correctPassword = async function (password: string): Promise<boolean> {
    return await compare(password, this.password)
}

userSchema.methods.hasPasswordChangedAfterJWT = function (this: UserDocument, JWTTimestamp: number): boolean {
    if (this.passwordChangedAt) {
        const changedTimestamp = this.passwordChangedAt.getTime() / 1000
        return JWTTimestamp < changedTimestamp
    }
    return false
}

export const User = model<UserDocument>('User', userSchema)