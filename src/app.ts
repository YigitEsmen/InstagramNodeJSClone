import express from 'express'

import userRouter from './routes/userRoutes'
import AppError from './utils/appError'
import StatusCode from './utils/statusCode'
import globalErrorController from './controllers/errorController'

const app = express()

app.use(express.json({ limit: '10kb' }))

app.use('/api/v1/users', userRouter)

app.all('*', (req, _res, next) => {
    next(new AppError(`The requested URL '${req.originalUrl}' was not found on this server.`, StatusCode.NotFound))
})

app.use(globalErrorController)

export default app