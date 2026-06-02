const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true },
});

const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  logo: { type: String },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ownerName: { type: String, required: true },
  gstNumber: { type: String },
  address: { type: String, required: true },
  city: { type: String },
  state: { type: String },
  pincode: { type: String },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  restaurantType: {
    type: String,
    enum: ['fine_dining', 'casual', 'cafe', 'fast_food', 'buffet', 'cloud_kitchen', 'bar', 'bakery'],
    default: 'casual',
  },
  floors: { type: Number, default: 1 },
  totalTables: { type: Number, default: 10 },
  seatingCapacity: { type: Number, default: 40 },
  openingTime: { type: String, default: '09:00' },
  closingTime: { type: String, default: '23:00' },
  isOpen: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  currency: { type: String, default: 'INR' },
  currencySymbol: { type: String, default: '₹' },
  gstPercentage: { type: Number, default: 18 },
  serviceCharge: { type: Number, default: 0 },
  socialMedia: {
    instagram: String,
    facebook: String,
    twitter: String,
    website: String,
  },
  branches: [branchSchema],
  description: { type: String },
  cuisine: [{ type: String }],
  rating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  bankDetails: {
    accountName: String,
    accountNumber: String,
    ifscCode: String,
    bankName: String,
    upiId: String,
  },

  subscriptionPlan: {
    type: String,
    enum: ['free', 'basic', 'pro', 'enterprise'],
    default: 'free',
  },
}, { timestamps: true });

module.exports = mongoose.model('Restaurant', restaurantSchema);
