import { Admin } from './models/index.js'

export function requireAuth(req, res, next) {
  if (!req.session?.account) return res.status(401).json({ message: 'Please sign in to continue.' })
  next()
}

export function requireRole(...roles) {
  return async (req, res, next) => {
    if (!req.session?.account || !roles.includes(req.session.account.role)) {
      return res.status(403).json({ message: 'You do not have permission to access this resource.' })
    }
    if (req.session.account.role === 'admin') {
      const valid = await Admin.exists({ _id: req.session.account.id })
      if (!valid) return res.status(401).json({ message: 'Admin session is no longer valid.' })
    }
    next()
  }
}

export function safeAccount(account, role) {
  if (!account) return null
  const name = account.fullName || account.storeName || account.username
  return { id: String(account._id), name, email: account.email, role }
}

export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
}
