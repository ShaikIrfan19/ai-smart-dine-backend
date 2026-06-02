const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, unique: true, sparse: true },
  password: { type: String, minlength: 6 },
  role: {
    type: String,
    enum: ['super_admin', 'restaurant_admin', 'waiter', 'customer'],
    default: 'customer',
  },
  avatar: { type: String, default: null },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', default: null },
  isActive: { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },
  otp: { type: String },
  otpExpire: { type: Date },
  resetPasswordToken: { type: String },
  resetPasswordExpire: { type: Date },
  firebaseUid: { type: String, unique: true, sparse: true },
  googleId: { type: String, unique: true, sparse: true },
  lastLogin: { type: Date },
  preferences: {
    theme: { type: String, default: 'dark' },
    language: { type: String, default: 'en' },
    notifications: { type: Boolean, default: true },
  },
  deviceTokens: [{ type: String }],
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate OTP
userSchema.methods.generateOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = otp;
  this.otpExpire = Date.now() + (parseInt(process.env.OTP_EXPIRE) || 10) * 60 * 1000;
  return otp;
};

module.exports = mongoose.model('User', userSchema);
