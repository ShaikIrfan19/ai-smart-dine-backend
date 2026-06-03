const express = require('express');
const Reservation = require('../models/Reservation.model');
const User = require('../models/User.model');
const { protect, authorize } = require('../middleware/auth.middleware');

const reservationRouter = express.Router();
reservationRouter.use(protect);

reservationRouter.post('/', async (req, res) => {
  try {
    const reservation = await Reservation.create({ ...req.body, customerId: req.user._id });
    res.status(201).json({ success: true, data: reservation });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

reservationRouter.get('/', async (req, res) => {
  try {
    const { restaurantId, status, date, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (restaurantId) filter.restaurantId = restaurantId;
    else if (req.user.restaurantId) filter.restaurantId = req.user.restaurantId;
    if (req.user.role === 'customer') filter.customerId = req.user._id;
    if (status) filter.status = status;
    if (date) {
      const d = new Date(date); d.setHours(0,0,0,0);
      const e = new Date(date); e.setHours(23,59,59,999);
      filter.date = { $gte: d, $lte: e };
    }
    const reservations = await Reservation.find(filter).populate('tableId', 'tableNumber').sort({ date: 1 }).limit(limit*1).skip((page-1)*limit);
    const total = await Reservation.countDocuments(filter);
    res.json({ success: true, data: reservations, total });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

reservationRouter.patch('/:id/status', authorize('restaurant_admin', 'super_admin'), async (req, res) => {
  try {
    const reservation = await Reservation.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.json({ success: true, data: reservation });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

reservationRouter.delete('/:id', async (req, res) => {
  try {
    await Reservation.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Reservation cancelled' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Staff routes
const staffRouter = express.Router();
staffRouter.use(protect, authorize('restaurant_admin', 'super_admin'));

staffRouter.get('/', async (req, res) => {
  try {
    const restaurantId = req.query.restaurantId || req.user.restaurantId || req.user._id;
    const staff = await User.find({ restaurantId, role: { $in: ['waiter', 'restaurant_admin'] } }).select('-password');
    res.json({ success: true, data: staff });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

staffRouter.post('/', async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Email already exists' });
    const staff = await User.create({ name, email, phone, password, role, restaurantId: req.user.restaurantId || req.user._id });
    res.status(201).json({ success: true, data: staff });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

staffRouter.patch('/:id/status', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: req.body.isActive }, { new: true }).select('-password');
    res.json({ success: true, data: user });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// User routes
const userRouter = express.Router();
userRouter.use(protect);
userRouter.get('/profile', async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  res.json({ success: true, data: user });
});
userRouter.put('/profile', async (req, res) => {
  try {
    const { name, phone, avatar, preferences } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { name, phone, avatar, preferences }, { new: true }).select('-password');
    res.json({ success: true, data: user });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Notification routes (placeholder)
const notificationRouter = express.Router();
notificationRouter.use(protect);
notificationRouter.get('/', (req, res) => res.json({ success: true, data: [] }));

module.exports = { reservationRouter, staffRouter, userRouter, notificationRouter };
