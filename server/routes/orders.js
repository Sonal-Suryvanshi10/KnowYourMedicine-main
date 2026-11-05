import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { Cart, Medicine, Order } from '../models/index.js'
import { asyncHandler, requireAuth, requireRole } from '../middleware.js'

const router = Router()
router.use(requireAuth)
router.post('/', requireRole('user'), asyncHandler(async (req, res) => {
  const { fullName, address, city, state, zip, phone, paymentMethod } = req.body
  if (![fullName, address, city, state, zip, phone].every(value => String(value || '').trim())) return res.status(400).json({ message: 'Please fill in all delivery details.' })
  if (!/^\d{10}$/.test(phone)) return res.status(400).json({ message: 'Enter a valid 10-digit phone number.' })
  if (!/^\d{6}$/.test(zip)) return res.status(400).json({ message: 'Enter a valid 6-digit PIN code.' })
  if (!['COD', 'Card'].includes(paymentMethod)) return res.status(400).json({ message: 'Choose a valid payment method.' })
  const cart = await Cart.findOne({ user: req.session.account.id }).populate('items.medicine')
  if (!cart?.items.length) return res.status(400).json({ message: 'Your cart is empty.' })
  const orderItems = []
  for (const item of cart.items) {
    if (!item.medicine) return res.status(409).json({ message: 'A medicine in your cart is no longer available.' })
    if (item.medicine.stock < item.quantity) return res.status(409).json({ message: `${item.medicine.name} does not have enough stock.` })
    orderItems.push({ medicine: item.medicine._id, medicineName: item.medicine.name, quantity: item.quantity, price: item.medicine.price })
  }
  const totalAmount = orderItems.reduce((sum, item) => sum + item.quantity * item.price, 0)
  const decremented = []
  try {
    for (const item of orderItems) {
      const update = await Medicine.updateOne({ _id: item.medicine, stock: { $gte: item.quantity } }, { $inc: { stock: -item.quantity } })
      if (!update.modifiedCount) throw new Error(`${item.medicineName} just went out of stock. Please refresh your cart.`)
      decremented.push(item)
    }
    const orderId = `ORD-${randomUUID().slice(0, 8).toUpperCase()}`
    const order = await Order.create({ orderId, user: req.session.account.id, userEmail: req.session.account.email, fullName: fullName.trim(), address: address.trim(), city: city.trim(), state: state.trim(), zip, phone, paymentMethod, paymentStatus: paymentMethod === 'COD' ? 'Pending' : 'Awaiting gateway', totalAmount, items: orderItems })
    await Cart.findOneAndDelete({ user: req.session.account.id }).catch(() => null)
    res.status(201).json({ order: { orderId: order.orderId, status: order.status, totalAmount: order.totalAmount, paymentMethod: order.paymentMethod } })
  } catch (error) {
    await Promise.all(decremented.map(item => Medicine.updateOne({ _id: item.medicine }, { $inc: { stock: item.quantity } })))
    if (error.message.includes('out of stock')) return res.status(409).json({ message: error.message })
    throw error
  }
}))
router.get('/', requireRole('user'), asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.session.account.id }).sort({ createdAt: -1 }).select('-phone -address')
  res.json({ orders })
}))
router.get('/:orderId', asyncHandler(async (req, res) => {
  const filter = { orderId: req.params.orderId }
  if (req.session.account.role === 'user') filter.user = req.session.account.id
  else if (req.session.account.role !== 'admin') return res.status(403).json({ message: 'You do not have permission to view this order.' })
  const order = await Order.findOne(filter).populate('items.medicine', 'name')
  if (!order) return res.status(404).json({ message: 'Order not found.' })
  res.json({ order })
}))
export default router
