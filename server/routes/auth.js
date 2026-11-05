import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { Admin, Store, User } from '../models/index.js'
import { asyncHandler, safeAccount } from '../middleware.js'

const router = Router()
const roles = { user: User, store: Store, admin: Admin }

const regenerateSession = (req) => new Promise((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()))

router.get('/me', (req, res) => res.json({ account: req.session?.account || null }))
router.post('/register/user', asyncHandler(async (req, res) => {
  const { fullName, email, password, confirmPassword } = req.body
  if (!fullName?.trim() || !email?.trim() || !password) return res.status(400).json({ message: 'Name, email, and password are required.' })
  if (password !== confirmPassword) return res.status(400).json({ message: 'Passwords do not match.' })
  if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' })
  const normalized = email.trim().toLowerCase()
  if (await Promise.all([User.exists({ email: normalized }), Store.exists({ email: normalized }), Admin.exists({ email: normalized })]).then(items => items.some(Boolean))) return res.status(409).json({ message: 'An account with this email already exists.' })
  const account = await User.create({ fullName: fullName.trim(), email: normalized, passwordHash: await bcrypt.hash(password, 12) })
  await regenerateSession(req)
  req.session.account = safeAccount(account, 'user')
  res.status(201).json({ account: req.session.account })
}))
router.post('/register/store', asyncHandler(async (req, res) => {
  const { storeName, storeEmail, location, contactNumber, password, confirmPassword } = req.body
  if (![storeName, storeEmail, location, contactNumber, password].every(value => String(value || '').trim())) return res.status(400).json({ message: 'Please complete all store registration fields.' })
  if (password !== confirmPassword) return res.status(400).json({ message: 'Passwords do not match.' })
  if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' })
  const email = storeEmail.trim().toLowerCase()
  if (await Promise.all([User.exists({ email }), Store.exists({ email }), Admin.exists({ email })]).then(items => items.some(Boolean))) return res.status(409).json({ message: 'An account with this email already exists.' })
  const account = await Store.create({ storeName: storeName.trim(), email, location: location.trim(), contactNumber: contactNumber.trim(), passwordHash: await bcrypt.hash(password, 12) })
  await regenerateSession(req)
  req.session.account = safeAccount(account, 'store')
  res.status(201).json({ account: req.session.account })
}))
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password, accountType = 'user' } = req.body
  if (!roles[accountType] || !email || !password) return res.status(400).json({ message: 'Choose an account type and enter your email and password.' })
  const Model = roles[accountType]
  const account = await Model.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash')
  if (!account || !(await bcrypt.compare(password, account.passwordHash))) return res.status(401).json({ message: 'Email or password is incorrect.' })
  await regenerateSession(req)
  req.session.account = safeAccount(account, accountType)
  res.json({ account: req.session.account })
}))
router.post('/logout', (req, res, next) => req.session.destroy(error => {
  if (error) return next(error)
  res.clearCookie('kym.sid')
  res.json({ message: 'Signed out.' })
}))

export default router
