// Restaurant Controller
const Restaurant = require('../models/Restaurant.model');
const User = require('../models/User.model');
const QRCode = require('qrcode');

const createRestaurant = async (req, res) => {
  try {
    const restaurantData = { ...req.body, ownerId: req.user._id };
    const restaurant = await Restaurant.create(restaurantData);

    // Update user's restaurantId
    await User.findByIdAndUpdate(req.user._id, { restaurantId: restaurant._id });

    res.status(201).json({ success: true, data: restaurant });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id).populate('ownerId', 'name email');
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
    res.json({ success: true, data: restaurant });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllRestaurants = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, type } = req.query;
    const filter = {};
    if (search) filter.name = { $regex: search, $options: 'i' };
    if (type) filter.restaurantType = type;
    if (req.user.role !== 'super_admin') filter.ownerId = req.user._id;

    const restaurants = await Restaurant.find(filter)
      .populate('ownerId', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Restaurant.countDocuments(filter);
    res.json({ success: true, data: restaurants, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, data: restaurant });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const toggleRestaurantStatus = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    restaurant.isOpen = !restaurant.isOpen;
    await restaurant.save();
    res.json({ success: true, data: { isOpen: restaurant.isOpen }, message: `Restaurant is now ${restaurant.isOpen ? 'open' : 'closed'}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createRestaurant, getRestaurant, getAllRestaurants, updateRestaurant, toggleRestaurantStatus };
