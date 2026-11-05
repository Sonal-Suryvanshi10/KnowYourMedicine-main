import 'dotenv/config'
import mysql from 'mysql2/promise'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { Admin, Cart, Medicine, Order, Store, User } from '../server/models/index.js'

const uri = process.env.MONGODB_URI
const mysqlUrl = process.env.LEGACY_MYSQL_URL
if (!uri || !mysqlUrl) {
  console.error('Set MONGODB_URI and LEGACY_MYSQL_URL in your ignored .env file before importing.')
  process.exit(1)
}
const value = (row, ...names) => names.map(name => row?.[name]).find(item => item !== undefined && item !== null)
const key = value => value === undefined || value === null ? '' : String(value)
const tableName = rows => rows[0] && Object.values(rows[0])[0]
const legacyUsers = new Map()
const legacyStores = new Map()
const legacyMedicines = new Map()
const legacyOrders = new Map()
const added = { users: 0, stores: 0, admins: 0, medicines: 0, carts: 0, orders: 0 }

async function main() {
  await mongoose.connect(uri)
  const targetCount = await Promise.all([User.countDocuments(), Store.countDocuments(), Admin.countDocuments(), Medicine.countDocuments(), Cart.countDocuments(), Order.countDocuments()])
  if (targetCount.some(Boolean)) throw new Error('Target MongoDB collections are not empty. Import into a fresh database to avoid duplicate records.')
  const connection = await mysql.createConnection(mysqlUrl)
  const [tableRows] = await connection.query('SHOW TABLES')
  const tables = new Set(tableRows.map(tableName))
  const read = async table => tables.has(table) ? (await connection.query(`SELECT * FROM \`${table}\``))[0] : []

  for (const row of await read('stores')) {
    const email = key(value(row, 'store_email', 'email')).trim().toLowerCase()
    if (!email || !value(row, 'password')) continue
    const store = await Store.create({ storeName: value(row, 'store_name', 'name') || 'Medicine store', email, location: value(row, 'location', 'store_location') || '', contactNumber: key(value(row, 'contact_number', 'store_contact', 'contact')), passwordHash: await bcrypt.hash(String(value(row, 'password')), 12), createdAt: value(row, 'created_at') || new Date() })
    legacyStores.set(key(value(row, 'id')), store._id)
    added.stores++
  }
  for (const row of await read('users')) {
    const email = key(value(row, 'email')).trim().toLowerCase()
    if (!email || !value(row, 'password')) continue
    const user = await User.create({ fullName: value(row, 'full_name', 'name') || 'Medicine user', email, passwordHash: await bcrypt.hash(String(value(row, 'password')), 12), createdAt: value(row, 'created_at') || new Date() })
    legacyUsers.set(key(value(row, 'id')), user._id)
    legacyUsers.set(email, user._id)
    added.users++
  }
  const adminRows = [...await read('admin'), ...await read('admins')]
  for (const row of adminRows) {
    const email = key(value(row, 'email', 'admin_email')).trim().toLowerCase()
    if (!email || !value(row, 'password') || await Admin.exists({ email })) continue
    await Admin.create({ username: value(row, 'username', 'name') || 'Administrator', email, passwordHash: await bcrypt.hash(String(value(row, 'password')), 12), createdAt: value(row, 'created_at') || new Date() })
    added.admins++
  }

  const medicineRows = [...await read('medicines'), ...await read('storemedicines')]
  for (const row of medicineRows) {
    const name = value(row, 'name', 'medicine_name')
    if (!name) continue
    const oldId = key(value(row, 'id', 'medicine_id'))
    const oldStoreId = key(value(row, 'store_id'))
    const store = legacyStores.get(oldStoreId) || null
    const medicine = await Medicine.create({ name, description: value(row, 'description') || '', dosage: value(row, 'dosage') || '', sideEffects: value(row, 'side_effects', 'sideEffects') || '', benefits: value(row, 'benefits') || '', price: Math.max(0, Number(value(row, 'price')) || 0), stock: Math.max(0, Number(value(row, 'stock', 'quantity')) || 0), store, createdAt: value(row, 'created_at') || new Date() })
    if (oldId && !legacyMedicines.has(oldId)) legacyMedicines.set(oldId, medicine._id)
    added.medicines++
  }

  for (const row of await read('cart_items')) {
    const email = key(value(row, 'user_email')).trim().toLowerCase()
    const userId = legacyUsers.get(email) || legacyUsers.get(key(value(row, 'user_id')))
    const medicine = legacyMedicines.get(key(value(row, 'medicine_id')))
    if (!userId || !medicine) continue
    let cart = await Cart.findOne({ user: userId })
    if (!cart) cart = new Cart({ user: userId, items: [] })
    const item = cart.items.find(entry => String(entry.medicine) === String(medicine))
    if (item) item.quantity += Math.max(1, Number(value(row, 'quantity')) || 1)
    else cart.items.push({ medicine, quantity: Math.max(1, Number(value(row, 'quantity')) || 1) })
    await cart.save()
    added.carts++
  }

  for (const row of await read('orders')) {
    const email = key(value(row, 'user_email', 'email')).trim().toLowerCase()
    const userId = legacyUsers.get(email) || legacyUsers.get(key(value(row, 'user_id')))
    if (!userId) continue
    const rawId = key(value(row, 'order_id', 'id'))
    const orderId = /^ORD-/i.test(rawId) ? rawId : `ORD-LEGACY-${rawId}`
    const order = await Order.create({ orderId, user: userId, userEmail: email || (await User.findById(userId)).email, fullName: value(row, 'full_name', 'name') || 'Customer', address: value(row, 'address') || 'Not provided', city: value(row, 'city') || 'Not provided', state: value(row, 'state') || 'Not provided', zip: key(value(row, 'zip', 'postal_code')) || '000000', phone: key(value(row, 'phone', 'contact_number')) || '0000000000', paymentMethod: String(value(row, 'payment_method')).toLowerCase() === 'card' ? 'Card' : 'COD', paymentStatus: String(value(row, 'payment_method')).toLowerCase() === 'card' ? 'Awaiting gateway' : 'Pending', totalAmount: Math.max(0, Number(value(row, 'total_amount')) || 0), status: ['Processing', 'Shipped', 'Delivered', 'Cancelled'].includes(value(row, 'status')) ? value(row, 'status') : 'Processing', createdAt: value(row, 'order_date', 'created_at') || new Date(), items: [] })
    legacyOrders.set(rawId, order)
    added.orders++
  }
  for (const row of await read('order_items')) {
    const order = legacyOrders.get(key(value(row, 'order_id')))
    if (!order) continue
    const medicine = legacyMedicines.get(key(value(row, 'medicine_id')))
    order.items.push({ medicine, medicineName: value(row, 'medicine_name', 'name') || 'Medicine', quantity: Math.max(1, Number(value(row, 'quantity')) || 1), price: Math.max(0, Number(value(row, 'price')) || 0) })
  }
  for (const order of legacyOrders.values()) await order.save()
  await connection.end()
  console.log('Legacy MySQL import complete:', added)
  console.log('Review migrated records in the admin dashboard. The source MySQL database was left unchanged.')
}
main().catch(() => { console.error('Import failed. Check source and target database access, and confirm the legacy table field mapping.'); process.exitCode = 1 }).finally(async () => { await mongoose.disconnect() })
