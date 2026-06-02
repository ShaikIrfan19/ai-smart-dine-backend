const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  tableNumber: { type: String, required: true },
  floor: { type: Number, default: 1 },
  seatingCapacity: { type: Number, required: true, default: 4 },
  tableType: {
    type: String,
    enum: ['regular', 'couple', 'family', 'vip', 'window', 'outdoor', 'bar'],
    default: 'regular',
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'reserved', 'cleaning', 'inactive'],
    default: 'available',
  },
  currentOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  assignedWaiterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  currentCustomerCount: { type: Number, default: 0 },
  occupiedSince: { type: Date, default: null },
  reservedFor: { type: Date, default: null },
  qrCode: { type: String },
  mergedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Table' }],
  position: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
  },
  isActive: { type: Boolean, default: true },
  features: {
    hasAC: { type: Boolean, default: false },
    hasTV: { type: Boolean, default: false },
    isPrivate: { type: Boolean, default: false },
    hasWindowView: { type: Boolean, default: false },
  },
}, { timestamps: true });

tableSchema.index({ restaurantId: 1, tableNumber: 1 }, { unique: true });

module.exports = mongoose.model('Table', tableSchema);
