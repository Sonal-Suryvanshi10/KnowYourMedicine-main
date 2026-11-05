import { Router } from 'express'
import { Admin, Medicine, Order, Store, User } from '../models/index.js'
import { asyncHandler, requireAuth, requireRole } from '../middleware.js'

const router = Router()
router.use(requireAuth, requireRole('admin'))
router.get('/overview', asyncHandler(async (_req, res) => {
  const [users, stores, medicines, orders, recentOrders] = await Promise.all([
    User.countDocuments(), Store.countDocuments(), Medicine.countDocuments(), Order.countDocuments(),
    Order.find().sort({ createdAt: -1 }).limit(10).select('orderId fullName totalAmount status createdAt paymentMethod').lean(),
  ])
  res.json({ stats: { users, stores, medicines, orders }, recentOrders })
}))
router.get('/users', asyncHandler(async (_req, res) => res.json({ users: await User.find().select('fullName email createdAt').sort({ createdAt: -1 }).limit(300) })))
router.get('/stores', asyncHandler(async (_req, res) => res.json({ stores: await Store.find().select('storeName email location contactNumber createdAt').sort({ createdAt: -1 }).limit(300) })))
router.get('/medicines', asyncHandler(async (_req, res) => res.json({ medicines: await Medicine.find().populate('store', 'storeName').sort({ updatedAt: -1 }).limit(500) })))
router.get('/orders', asyncHandler(async (_req, res) => res.json({ orders: await Order.find().sort({ createdAt: -1 }).limit(500) })))
router.patch('/orders/:id/status', asyncHandler(async (req, res) => {
  const allowed = ['Processing', 'Shipped', 'Delivered', 'Cancelled']
  if (!allowed.includes(req.body.status)) return res.status(400).json({ message: 'Invalid order status.' })
  const order = await Order.findById(req.params.id)
  if (!order) return res.status(404).json({ message: 'Order not found.' })
  if (order.status === 'Cancelled' && req.body.status !== 'Cancelled') return res.status(409).json({ message: 'Cancelled orders cannot be reopened.' })
  if (order.paymentStatus === 'Awaiting gateway' && ['Shipped', 'Delivered'].includes(req.body.status)) return res.status(409).json({ message: 'A card-payment order cannot ship until a payment gateway confirms payment.' })
  if (order.status !== 'Cancelled' && req.body.status === 'Cancelled') {
    await Promise.all(order.items.map(item => Medicine.updateOne({ _id: item.medicine }, { $inc: { stock: item.quantity } })))
  }
  order.status = req.body.status
  await order.save()
  res.json({ order })
}))
router.delete('/users/:id', asyncHandler(async (req, res) => {
  if (!await User.findByIdAndDelete(req.params.id)) return res.status(404).json({ message: 'User not found.' })
  res.json({ message: 'User removed.' })
}))
router.get('/identity', asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.session.account.id).select('username email')
  if (!admin) return res.status(401).json({ message: 'Admin account no longer exists.' })
  res.json({ admin })
}))
export default router
