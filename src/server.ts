import { config } from 'dotenv'

// Load environment variables
config()

import app from './app'

// Start server
const port = process.env.PORT
app.listen(port, () => console.log(`App running on port ${port}...`))