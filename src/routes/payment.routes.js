// payment.routes.js
const express = require('express');
const paymentRouter = express.Router();
const { createPaymentOrder, verifyPayment, recordCashPayment, initiateRefund, getPaymentHistory } = require('../controllers/payment.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

paymentRouter.use(protect);
paymentRouter.post('/create-order', createPaymentOrder);
paymentRouter.post('/verify', verifyPayment);
paymentRouter.post('/cash', authorize('waiter', 'restaurant_admin', 'super_admin'), recordCashPayment);
paymentRouter.post('/refund', authorize('restaurant_admin', 'super_admin'), initiateRefund);
paymentRouter.get('/history', getPaymentHistory);

module.exports = paymentRouter;
