const express = require('express');
const router = express.Router();
const { createRestaurant, getRestaurant, getAllRestaurants, updateRestaurant, toggleRestaurantStatus } = require('../controllers/restaurant.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);
router.post('/', authorize('restaurant_admin', 'super_admin'), createRestaurant);
router.get('/', getAllRestaurants);
router.get('/:id', getRestaurant);
router.put('/:id', authorize('restaurant_admin', 'super_admin'), updateRestaurant);
router.patch('/:id/toggle', authorize('restaurant_admin', 'super_admin'), toggleRestaurantStatus);

module.exports = router;
