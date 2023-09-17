import { Request, Response, NextFunction } from 'express'

import { User, IUser, UserRole } from '../models/userModel'
import catchAsync from '../utils/catchAsync'
import AppError from '../utils/appError'
import StatusCode from '../utils/statusCode'

export const me = (req: Request, _res: Response, next: NextFunction) => {
    req.params.id = req.user.id
    next()
}

export const filterBody = catchAsync(async (req, _res, next) => {
    req.body = <IUser>{
        fullName: req.body.fullName,
        username: req.body.username,
        bio: req.body.bio,
        email: req.body.email,
        role: req.user.role === UserRole.Admin ? req.body.role : undefined
    }
    next()
})

export const getAllUsers = catchAsync(async (_req, res) => {
    const users = await User.find()

    res.status(StatusCode.Ok).json({
        status: 'success',
        results: users.length,
        data: {
            users
        }
    })
})

export const getUser = catchAsync(async (req, res) => {
    const user = await User.findById(req.params.id)

    res.status(StatusCode.Ok).json({
        status: 'success',
        data: {
            user
        }
    })
})

export const updateUser = catchAsync(async (req, res, next) => {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    }).select('+email +role')

    if (!updatedUser) {
        return next(new AppError('No user found with that ID.', StatusCode.NotFound))
    }

    res.status(StatusCode.Ok).json({
        status: 'success',
        data: {
            user: updatedUser
        }
    })
})

export const deleteUser = catchAsync(async (req, res, next) => {
    const user = await User.findByIdAndDelete(req.params.id)
    if (!user) {
        return next(new AppError('No user found with that ID.', StatusCode.NotFound))
    }
    res.status(StatusCode.NoContent).json()
})