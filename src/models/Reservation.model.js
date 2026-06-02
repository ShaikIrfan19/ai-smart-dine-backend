const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', default: null },
  reservationNumber: { type: String, unique: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  customerEmail: { type: String },
  guestCount: { type: Number, required: true, min: 1 },
  tableType: {
    type: String,
    enum: ['regular', 'couple', 'family', 'vip', 'window', 'outdoor'],
    default: 'regular',
  },
  date: { type: Date, required: true },
  timeSlot: { type: String, required: true }, // "19:00 - 21:00"
  duration: { type: Number, default: 120 }, // minutes
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'],
    default: 'pending',
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending',
  },
  advanceAmount: { type: Number, default: 0 },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  specialRequests: { type: String },
  occasion: { type: String },
  notes: { type: String },
  reminderSent: { type: Boolean, default: false },
  checkInTime: { type: Date },
  checkOutTime: { type: Date },
}, { timestamps: true });

reservationSchema.pre('save', async function (next) {
  if (!this.reservationNumber) {
    const count = await mongoose.model('Reservation').countDocuments({ restaurantId: this.restaurantId });
    const date = new Date();
    this.reservationNumber = `RES-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Reservation', reservationSchema);
