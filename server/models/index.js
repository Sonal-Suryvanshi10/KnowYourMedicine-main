import mongoose from 'mongoose'

const accountOptions = { timestamps: true, versionKey: false }
const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true, select: false },
}, accountOptions)
const storeSchema = new mongoose.Schema({
  storeName: { type: String, required: true, trim: true, maxlength: 140 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  location: { type: String, required: true, trim: true, maxlength: 240 },
  contactNumber: { type: String, required: true, trim: true, maxlength: 24 },
  passwordHash: { type: String, required: true, select: false },
}, accountOptions)
const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true, select: false },
}, accountOptions)
const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 160, index: true },
  description: { type: String, default: '', maxlength: 5000 },
  dosage: { type: String, default: '', maxlength: 1000 },
  sideEffects: { type: String, default: '', maxlength: 2000 },
  benefits: { type: String, default: '', maxlength: 2000 },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, default: 0, min: 0 },
  store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', default: null, index: true },
}, { timestamps: true, versionKey: false })
medicineSchema.index({ name: 'text', description: 'text', benefits: 'text' })
const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items: [{ medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true }, quantity: { type: Number, required: true, min: 1 } }],
}, { timestamps: true, versionKey: false })
const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  userEmail: { type: String, required: true, lowercase: true },
  fullName: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zip: { type: String, required: true },
  phone: { type: String, required: true },
  paymentMethod: { type: String, enum: ['COD', 'Card'], required: true },
  paymentStatus: { type: String, enum: ['Pending', 'Awaiting gateway'], default: 'Pending' },
  totalAmount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['Processing', 'Shipped', 'Delivered', 'Cancelled'], default: 'Processing' },
  items: [{ medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' }, medicineName: String, quantity: { type: Number, min: 1 }, price: { type: Number, min: 0 } }],
}, { timestamps: true, versionKey: false })

export const User = mongoose.model('User', userSchema)
export const Store = mongoose.model('Store', storeSchema)
export const Admin = mongoose.model('Admin', adminSchema)
export const Medicine = mongoose.model('Medicine', medicineSchema)
export const Cart = mongoose.model('Cart', cartSchema)
export const Order = mongoose.model('Order', orderSchema)
