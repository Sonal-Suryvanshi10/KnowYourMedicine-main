import { Router } from 'express'
import { Cart, Medicine } from '../models/index.js'
import { asyncHandler, requireAuth, requireRole } from '../middleware.js'

const router = Router()
router.use(requireAuth, requireRole('user'))
async function getCart(user) {
  return (await Cart.findOne({ user }).populate('items.medicine')) || new Cart({ user, items: [] })
}
function cartResponse(cart) {
  const items = cart.items.filter(item => item.medicine).map(item => ({ medicine: item.medicine, quantity: item.quantity, lineTotal: item.quantity * item.medicine.price }))
  return { items, total: items.reduce((sum, item) => sum + item.lineTotal, 0), count: items.reduce((sum, item) => sum + item.quantity, 0) }
}
router.get('/', asyncHandler(async (req, res) => res.json({ cart: cartResponse(await getCart(req.session.account.id)) })))
router.post('/', asyncHandler(async (req, res) => {
  const { medicineId, quantity = 1 } = req.body
  const count = Number.parseInt(quantity, 10)
  if (!Number.isInteger(count) || count < 1 || count > 99) return res.status(400).json({ message: 'Enter a quantity from 1 to 99.' })
  const medicine = await Medicine.findById(medicineId)
  if (!medicine) return res.status(404).json({ message: 'Medicine not found.' })
  if (medicine.stock < count) return res.status(409).json({ message: 'There is not enough stock for that quantity.' })
  const cart = await getCart(req.session.account.id)
  const existing = cart.items.find(item => String(item.medicine?._id || item.medicine) === String(medicine._id))
  if (existing) existing.quantity = Math.min(99, existing.quantity + count)
  else cart.items.push({ medicine: medicine._id, quantity: count })
  await cart.save()
  await cart.populate('items.medicine')
  res.json({ cart: cartResponse(cart), message: 'Added to your cart.' })
}))
router.patch('/:medicineId', asyncHandler(async (req, res) => {
  const quantity = Number.parseInt(req.body.quantity, 10)
  const cart = await Cart.findOne({ user: req.session.account.id })
  if (!cart) return res.status(404).json({ message: 'Cart is empty.' })
  const item = cart.items.find(row => String(row.medicine) === req.params.medicineId)
  if (!item) return res.status(404).json({ message: 'Cart item not found.' })
  if (quantity <= 0) cart.items = cart.items.filter(row => String(row.medicine) !== req.params.medicineId)
  else if (quantity > 99) return res.status(400).json({ message: 'Maximum quantity is 99.' })
  else item.quantity = quantity
  await cart.save()
  await cart.populate('items.medicine')
  res.json({ cart: cartResponse(cart) })
}))
router.delete('/:medicineId', asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.session.account.id })
  if (cart) { cart.items = cart.items.filter(item => String(item.medicine) !== req.params.medicineId); await cart.save(); await cart.populate('items.medicine') }
  res.json({ cart: cartResponse(cart || { items: [] }) })
}))
router.delete('/', asyncHandler(async (req, res) => {
  await Cart.findOneAndDelete({ user: req.session.account.id })
  res.json({ cart: { items: [], total: 0, count: 0 } })
}))
export default router
