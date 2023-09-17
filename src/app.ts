import express from 'express'

const app = express()

// Test route
app.get('/', (_req, res) => {
    res.status(200).json('Hello from the server side 👋')
})

export default app