import { Request, Response, NextFunction } from 'express'
import { Error } from 'mongoose'
import { MongoServerError } from 'mongodb'
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken'

import AppError from '../utils/appError'
import StatusCode from '../utils/statusCode'

const handleCastErrorDB = (castError: Error.CastError): AppError => {
    const message = `Invalid ${castError.path}: ${castError.value}.`
    return new AppError(message, StatusCode.BadRequest)
}

const handleDuplicateFieldsErrorDB = (mongoServerError: MongoServerError): AppError => {
    const value = mongoServerError.errmsg.match(/"(.*?)"/)![0]

    const message = `Duplicate field value: ${value}. Please use another value.`
    return new AppError(message, StatusCode.BadRequest)
}

const handleValidationErrorDB = (validationError: Error.ValidationError): AppError => {
    const errors = Object.values(validationError.errors).map(castOrValidatorErr => castOrValidatorErr.message)

    const message = `Invalid input data. ${errors.join(' ')}`
    return new AppError(message, StatusCode.BadRequest)
}

const sendErrorDev = (error: Error, res: Response) => {
    if (error instanceof AppError) {
        return res.status(error.statusCode).json({
            status: error.status,
            error: error,
            message: error.message,
            stack: error.stack
        })
    }
    res.status(StatusCode.InternalServerError).json({
        status: 'error',
        error,
        message: error.message,
        stack: error.stack
    })
}

const sendErrorProd = (error: Error, res: Response) => {
    if (error instanceof AppError) {
        return res.status(error.statusCode).json({
            status: error.status,
            message: error.message
        })
    }
    console.error('ERROR 💥', error)

    res.status(StatusCode.InternalServerError).json({
        status: 'error',
        message: 'Something went wrong.'
    })
}

export default (error: Error, _req: Request, res: Response, _next: NextFunction) => {
    switch (process.env.NODE_ENV) {
        case 'development':
            sendErrorDev(error, res)
            break
        case 'production':
            let appError: AppError | undefined
            if (error instanceof Error.CastError) {
                appError = handleCastErrorDB(error)
            } else if ((error as MongoServerError).code === 11000) {
                appError = handleDuplicateFieldsErrorDB(error as MongoServerError)
            } else if (error instanceof Error.ValidationError) {
                appError = handleValidationErrorDB(error)
            } else if (error instanceof TokenExpiredError) {
                appError = new AppError('Your session has expired. Please log in again to continue.', StatusCode.Unauthorized)
            } else if (error instanceof JsonWebTokenError) {
                appError = new AppError('Invalid token. Please log in again.', StatusCode.Unauthorized)
            }
            sendErrorProd(appError ?? error, res)
            break
        default:
    }
}