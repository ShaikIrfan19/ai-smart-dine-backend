const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String },
  category: {
    type: String,
    enum: ['starters', 'main_course', 'desserts', 'drinks', 'combos', 'breads', 'soups', 'salads', 'snacks'],
    required: true,
  },
  price: { type: Number, required: true, min: 0 },
  discountedPrice: { type: Number, default: null },
  preparationTime: { type: Number, default: 15 }, // minutes
  ingredients: [{ type: String }],
  spicyLevel: {
    type: String,
    enum: ['none', 'mild', 'medium', 'hot', 'extra_hot'],
    default: 'none',
  },
  isVeg: { type: Boolean, default: true },
  isAvailable: { type: Boolean, default: true },
  availableQuantity: { type: Number, default: -1 }, // -1 = unlimited
  image: { type: String },
  tags: [{ type: String }],
  allergens: [{ type: String }],
  calories: { type: Number },
  isPopular: { type: Boolean, default: false },
  isBestSeller: { type: Boolean, default: false },
  isNew: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  totalRatings: { type: Number, default: 0 },
  totalOrders: { type: Number, default: 0 },
  addons: [{
    name: { type: String },
    price: { type: Number },
    isAvailable: { type: Boolean, default: true },
  }],
  customizations: [{
    title: String,
    options: [{
      name: String,
      extraPrice: { type: Number, default: 0 },
    }],
  }],
  relatedItems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' }],
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

menuItemSchema.index({ restaurantId: 1, category: 1 });
menuItemSchema.index({ restaurantId: 1, isAvailable: 1 });

module.exports = mongoose.model('MenuItem', menuItemSchema);
