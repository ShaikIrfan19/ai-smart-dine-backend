// payment.routes.js
const express = require('express');
const paymentRouter = express.Router();
const { recordCashPayment, getPaymentHistory } = require('../controllers/payment.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

paymentRouter.use(protect);
paymentRouter.post('/cash', authorize('waiter', 'restaurant_admin', 'super_admin'), recordCashPayment);
paymentRouter.get('/history', getPaymentHistory);

module.exports = paymentRouter;
