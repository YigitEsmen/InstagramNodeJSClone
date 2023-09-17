import { Request, Response, NextFunction } from 'express'
import { sign, verify } from 'jsonwebtoken'

import { User, IUser, UserDocument, UserRole } from '../models/userModel'
import AppError from '../utils/appError'
import catchAsync from '../utils/catchAsync'
import StatusCode from '../utils/statusCode'

interface JWTPayload {
    id: string
    iat: number
}

const signJWT = (id: string) => sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
})

const createAndSendJWT = (user: UserDocument, statusCode: StatusCode, res: Response) => {
    const jwt = signJWT(user.id)

    user.password = user.passwordChangedAt = user.__v = undefined

    res.status(statusCode).json({
        status: 'success',
        jwt,
        data: {
            user
        }
    })
}

export const signup = catchAsync(async (req, res) => {
    const newUser: UserDocument = await User.create(<IUser>{
        fullName: req.body.fullName,
        username: req.body.username,
        bio: req.body.bio,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm
    })

    createAndSendJWT(newUser, StatusCode.Created, res)
})

export const login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body

    if (!email || !password) {
        return next(new AppError('Please provide both email and password.', StatusCode.BadRequest))
    }

    const user = await User.findOne({ email }).select('+password')

    if (!user || !(await user.correctPassword(password))) {
        return next(new AppError('Invalid email or password. Please check your credentials.', StatusCode.Unauthorized))
    }

    createAndSendJWT(user, StatusCode.Ok, res)
})

export const verifyJWT = async (jwt: string): Promise<JWTPayload> => {
    return await new Promise<JWTPayload>((resolve, reject) => {
        verify(jwt, process.env.JWT_SECRET, (err, decoded) => {
            if (err) reject(err)
            else resolve(decoded as JWTPayload)
        })
    })
}

export const protect = catchAsync(async (req, _res, next) => {
    let jwt = ''
    const { authorization } = req.headers
    if (authorization && authorization.startsWith('Bearer')) {
        jwt = authorization.split(' ')[1]
    }

    if (!jwt) {
        return next(new AppError('You are not logged in. Please login to get access.', StatusCode.Unauthorized))
    }

    const decoded = await verifyJWT(jwt)

    const currentUser = await User.findById(decoded.id).select('+passwordChangedAt +role')
    if (!currentUser) {
        return next(new AppError('The user associated with this token no longer exists. Please log in again.', StatusCode.Unauthorized))
    }

    if (currentUser.hasPasswordChangedAfterJWT(decoded.iat)) {
        return next(new AppError('The user recently changed the password. Please log in again.', StatusCode.Unauthorized))
    }

    req.user = currentUser
    next()
})

export const restrictTo = (...roles: Array<UserRole>) => {
    return (req: Request, _res: Response, next: NextFunction) => {
        if (!roles.includes(req.user.role)) {
            return next(new AppError('You do not have permission to perform this action.', StatusCode.Forbidden))
        }
        next()
    }
}

export const updateMyPassword = catchAsync(async (req, res, next) => {
    const { currentPassword, password, passwordConfirm } = req.body
    if (!currentPassword || !password || !passwordConfirm) {
        return next(new AppError('Please provide all required fields: currentPassword, password, and passwordConfirm.', StatusCode.BadRequest))
    }

    const user = await User.findById(req.user.id).select('+password')

    if (!(await user!.correctPassword(currentPassword))) {
        return next(new AppError('Your current password is incorrect. Please provide the correct current password.', StatusCode.Unauthorized))
    }

    user!.password = password
    user!.passwordConfirm = passwordConfirm
    await user!.save()

    createAndSendJWT(user!, StatusCode.Ok, res)
})