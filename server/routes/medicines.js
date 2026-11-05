import { Router } from 'express'
import { Medicine, Store } from '../models/index.js'
import { asyncHandler, requireAuth, requireRole } from '../middleware.js'

const router = Router()
router.get('/', asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim()
  const filter = q ? { $or: ['name', 'description', 'dosage', 'sideEffects', 'benefits'].map(field => ({ [field]: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } })) } : {}
  const medicines = await Medicine.find(filter).populate('store', 'storeName location').sort({ name: 1 }).limit(100)
  res.json({ medicines })
}))
router.get('/mine', requireAuth, requireRole('store'), asyncHandler(async (req, res) => {
  const medicines = await Medicine.find({ store: req.session.account.id }).sort({ updatedAt: -1 })
  res.json({ medicines })
}))
router.post('/', requireAuth, requireRole('store', 'admin'), asyncHandler(async (req, res) => {
  const { name, description, dosage, sideEffects, benefits, price, stock } = req.body
  if (!name?.trim() || !Number.isFinite(Number(price)) || Number(price) < 0) return res.status(400).json({ message: 'Medicine name and a valid price are required.' })
  const store = req.session.account.role === 'store' ? req.session.account.id : req.body.storeId || null
  if (store && !await Store.exists({ _id: store })) return res.status(400).json({ message: 'Selected store does not exist.' })
  const medicine = await Medicine.create({ name: name.trim(), description, dosage, sideEffects, benefits, price: Number(price), stock: Math.max(0, Number.parseInt(stock, 10) || 0), store })
  res.status(201).json({ medicine })
}))
router.patch('/:id', requireAuth, requireRole('store', 'admin'), asyncHandler(async (req, res) => {
  const medicine = await Medicine.findById(req.params.id)
  if (!medicine) return res.status(404).json({ message: 'Medicine not found.' })
  if (req.session.account.role === 'store' && String(medicine.store) !== req.session.account.id) return res.status(403).json({ message: 'You may only edit medicines listed by your store.' })
  for (const field of ['name', 'description', 'dosage', 'sideEffects', 'benefits']) if (req.body[field] !== undefined) medicine[field] = req.body[field]
  if (req.body.price !== undefined) medicine.price = Number(req.body.price)
  if (req.body.stock !== undefined) medicine.stock = Number(req.body.stock)
  await medicine.save()
  res.json({ medicine })
}))
router.delete('/:id', requireAuth, requireRole('store', 'admin'), asyncHandler(async (req, res) => {
  const medicine = await Medicine.findById(req.params.id)
  if (!medicine) return res.status(404).json({ message: 'Medicine not found.' })
  if (req.session.account.role === 'store' && String(medicine.store) !== req.session.account.id) return res.status(403).json({ message: 'You may only remove medicines listed by your store.' })
  await medicine.deleteOne()
  res.json({ message: 'Medicine removed.' })
}))
export default router
