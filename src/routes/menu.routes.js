const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem.model');
const { protect, authorize } = require('../middleware/auth.middleware');

// GET all menu items
router.get('/', protect, async (req, res) => {
  try {
    const { restaurantId, category, isVeg, isAvailable, search, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (restaurantId) filter.restaurantId = restaurantId;
    else if (req.user.restaurantId || req.user._id) filter.restaurantId = req.user.restaurantId || req.user._id;
    if (category) filter.category = category;
    if (isVeg !== undefined) filter.isVeg = isVeg === 'true';
    if (isAvailable !== undefined) filter.isAvailable = isAvailable === 'true';
    if (search) filter.name = { $regex: search, $options: 'i' };

    const items = await MenuItem.find(filter).sort({ sortOrder: 1, createdAt: -1 }).limit(limit * 1).skip((page - 1) * limit);
    const total = await MenuItem.countDocuments(filter);
    res.json({ success: true, data: items, total });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST create menu item
router.post('/', protect, authorize('restaurant_admin', 'super_admin'), async (req, res) => {
  try {
    const item = await MenuItem.create({ ...req.body, restaurantId: req.body.restaurantId || req.user.restaurantId || req.user._id });
    res.status(201).json({ success: true, data: item });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// PUT update menu item
router.put('/:id', protect, authorize('restaurant_admin', 'super_admin'), async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: item });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// PATCH toggle availability
router.patch('/:id/availability', protect, authorize('restaurant_admin', 'super_admin'), async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    item.isAvailable = !item.isAvailable;
    await item.save();
    res.json({ success: true, data: { isAvailable: item.isAvailable } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// DELETE menu item
router.delete('/:id', protect, authorize('restaurant_admin', 'super_admin'), async (req, res) => {
  try {
    await MenuItem.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Item deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET categories
router.get('/categories', protect, (req, res) => {
  res.json({ success: true, data: ['starters', 'main_course', 'desserts', 'drinks', 'combos', 'breads', 'soups', 'salads', 'snacks'] });
});

module.exports = router;
