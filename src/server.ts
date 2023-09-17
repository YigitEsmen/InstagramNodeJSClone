import { config } from 'dotenv'
import { connect } from 'mongoose'

process.on('uncaughtException', (err) => {
    console.log('UNCOUGHT EXCEPTION 💥 Shutting down...')
    console.error('ERROR 💥', err)
    process.exit(1)
})

config()

connect(process.env.MONGODB_URI)

import app from './app'

const port = process.env.PORT
const server = app.listen(port, () => console.log(`App running or port ${port}...`))

process.on('unhandledRejection', err => {
    console.log('UNHANDLED REJECTION 💥 Shutting down...')
    console.error('ERROR 💥', err)
    server.close(() => process.exit(1))
})