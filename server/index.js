import 'dotenv/config'
import express from 'express'
import mongoose from 'mongoose'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import session from 'express-session'
import MongoStore from 'connect-mongo'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import bcrypt from 'bcryptjs'
import { Admin } from './models/index.js'
import authRoutes from './routes/auth.js'
import medicineRoutes from './routes/medicines.js'
import cartRoutes from './routes/cart.js'
import orderRoutes from './routes/orders.js'
import adminRoutes from './routes/admin.js'
import assistantRoutes from './routes/assistant.js'

const required = ['MONGODB_URI', 'SESSION_SECRET']
const missing = required.filter(key => !process.env[key])
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`)
  process.exit(1)
}
const app = express()
const serverDirectory = path.dirname(fileURLToPath(import.meta.url))
const clientBuildDirectory = path.resolve(serverDirectory, '../dist')
const port = Number(process.env.PORT || 5000)
const isProduction = process.env.NODE_ENV === 'production'
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map(origin => origin.trim().replace(/\/$/, '')).filter(Boolean)
const isAllowedOrigin = (origin, requestHost) => {
  if (!origin || allowedOrigins.includes(origin)) return true
  try {
    return new URL(origin).host.toLowerCase() === requestHost?.toLowerCase()
  } catch {
    return false
  }
}
app.disable('x-powered-by')
if (isProduction) app.set('trust proxy', 1)
app.use(helmet({ contentSecurityPolicy: { directives: { frameSrc: ["'self'", 'https://www.openstreetmap.org'] } } }))
app.use((req, res, next) => {
  const origin = req.get('origin')?.replace(/\/$/, '')
  if (!isAllowedOrigin(origin, req.get('host'))) return res.status(403).json({ message: 'This request origin is not allowed.' })
  cors({ origin: origin || false, credentials: true })(req, res, next)
})
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: false, limit: '1mb' }))
app.use(session({
  name: 'kym.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI, collectionName: 'sessions', ttl: 60 * 60 * 24 * 7 }),
  cookie: { httpOnly: true, secure: isProduction, sameSite: process.env.COOKIE_SAME_SITE || 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 },
}))
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Too many sign-in attempts. Please wait and try again.' } })
app.get('/api/health', (_req, res) => res.json({ ok: true, database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }))
app.use('/api/auth/login', loginLimiter)
app.use('/api/auth/register', rateLimit({ windowMs: 60 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false }))
app.use('/api/auth', authRoutes)
app.use('/api/medicines', medicineRoutes)
app.use('/api/cart', cartRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/assistant', assistantRoutes)
app.use('/api', (_req, res) => res.status(404).json({ message: 'API endpoint not found.' }))
app.use(express.static(clientBuildDirectory))
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path === '/api' || req.path.startsWith('/api/')) return next()
  res.sendFile(path.join(clientBuildDirectory, 'index.html'))
})
app.use((_req, res) => res.status(404).json({ message: 'Page not found.' }))
app.use((error, _req, res, _next) => {
  if (error?.code === 11000) return res.status(409).json({ message: 'This email address is already registered.' })
  if (error?.name === 'ValidationError' || error?.name === 'CastError') return res.status(400).json({ message: 'The submitted data is invalid.' })
  console.error('API request failed:', error?.name || 'UnknownError')
  res.status(500).json({ message: 'The server could not complete that request.' })
})

async function start() {
  await mongoose.connect(process.env.MONGODB_URI)
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const email = process.env.ADMIN_EMAIL.trim().toLowerCase()
    if (!await Admin.exists({ email })) {
      const username = process.env.ADMIN_NAME || 'Administrator'
      await Admin.create({ username, email, passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12) })
      console.log('Created the initial admin account from environment configuration.')
    }
  }
  app.listen(port, () => console.log(`Know Your Medicine API listening on http://localhost:${port}`))
}
start().catch(error => {
  if (error?.code === 'EADDRINUSE') console.error(`Unable to start API: port ${port} is already in use. Set PORT to an available port.`)
  else if (error?.codeName === 'AtlasError' && /bad auth|authentication failed/i.test(error.message || '')) console.error('Unable to connect to MongoDB Atlas: authentication failed. Verify the database username and password in MONGODB_URI, and URL-encode any special characters in the password.')
  else console.error(`Unable to start API. Check MONGODB_URI and database network access. (${error?.name || 'UnknownError'}${error?.code ? `, ${error.code}` : ''})`)
  process.exit(1)
})
