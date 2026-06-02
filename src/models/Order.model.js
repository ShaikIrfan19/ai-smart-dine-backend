const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  totalPrice: { type: Number, required: true },
  notes: { type: String },
  addons: [{
    name: String,
    price: Number,
  }],
  customizations: [{ type: String }],
  status: {
    type: String,
    enum: ['pending', 'preparing', 'ready', 'served', 'cancelled'],
    default: 'pending',
  },
  isVeg: { type: Boolean },
  image: { type: String },
});

const orderSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
  tableNumber: { type: String },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  waiterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  orderNumber: { type: String, unique: true },
  items: [orderItemSchema],
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled'],
    default: 'pending',
  },
  orderType: {
    type: String,
    enum: ['dine_in', 'takeaway', 'delivery'],
    default: 'dine_in',
  },
  subtotal: { type: Number, required: true },
  gstAmount: { type: Number, default: 0 },
  gstPercentage: { type: Number, default: 18 },
  serviceCharge: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  couponCode: { type: String },
  couponDiscount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'refunded', 'failed'],
    default: 'pending',
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'upi', 'card', 'wallet', 'net_banking', 'mixed'],
    default: null,
  },
  notes: { type: String },
  specialInstructions: { type: String },
  estimatedTime: { type: Number }, // minutes
  completedAt: { type: Date },
  billGenerated: { type: Boolean, default: false },
  receipt: { type: String }, // URL to receipt PDF
}, { timestamps: true });

// Auto-generate order number
orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments({ restaurantId: this.restaurantId });
    const date = new Date();
    this.orderNumber = `ORD-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

orderSchema.index({ restaurantId: 1, status: 1 });
orderSchema.index({ restaurantId: 1, createdAt: -1 });
orderSchema.index({ tableId: 1, status: 1 });

module.exports = mongoose.model('Order', orderSchema);
