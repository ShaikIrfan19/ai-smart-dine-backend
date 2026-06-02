const express = require('express');
const router = express.Router();
const { createOrder, getOrders, updateOrderStatus, getLiveOrders, addItemsToOrder } = require('../controllers/order.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);
router.post('/', createOrder);
router.get('/', getOrders);
router.get('/live', getLiveOrders);
router.patch('/:id/status', authorize('restaurant_admin', 'waiter', 'super_admin'), updateOrderStatus);
router.post('/:id/items', authorize('restaurant_admin', 'waiter', 'customer'), addItemsToOrder);

module.exports = router;
