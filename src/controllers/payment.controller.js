const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order.model');
const Reservation = require('../models/Reservation.model');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// @POST /api/payments/create-order
const createPaymentOrder = async (req, res) => {
  try {
    const { orderId, amount, type } = req.body; // type: 'order' or 'reservation'

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100), // paise
      currency: 'INR',
      receipt: `receipt_${orderId}_${Date.now()}`,
      notes: {
        orderId,
        type,
        appName: 'AI Smart Dine',
      },
    });

    // Save razorpayOrderId
    if (type === 'order') {
      await Order.findByIdAndUpdate(orderId, { razorpayOrderId: razorpayOrder.id });
    } else if (type === 'reservation') {
      await Reservation.findByIdAndUpdate(orderId, { razorpayOrderId: razorpayOrder.id });
    }

    res.json({
      success: true,
      data: {
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @POST /api/payments/verify
const verifyPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId, type } = req.body;
    const io = req.app.get('io');

    // Verify signature
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed. Invalid signature.' });
    }

    // Update order/reservation
    if (type === 'order') {
      const order = await Order.findByIdAndUpdate(orderId, {
        razorpayPaymentId,
        paymentStatus: 'paid',
        paymentMethod: 'razorpay',
        status: 'confirmed',
      }, { new: true });

      io.to(`restaurant:${order.restaurantId}`).emit('payment_received', {
        orderId,
        amount: order.totalAmount,
        method: 'razorpay',
      });
    } else if (type === 'reservation') {
      await Reservation.findByIdAndUpdate(orderId, {
        razorpayPaymentId,
        paymentStatus: 'paid',
        status: 'confirmed',
      });
    }

    res.json({ success: true, message: 'Payment verified successfully.', data: { razorpayPaymentId } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @POST /api/payments/cash
const recordCashPayment = async (req, res) => {
  try {
    const { orderId, amount, discount } = req.body;
    const io = req.app.get('io');

    const order = await Order.findByIdAndUpdate(orderId, {
      paymentStatus: 'paid',
      paymentMethod: 'cash',
      status: 'completed',
      completedAt: new Date(),
      discount: discount || 0,
    }, { new: true });

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    io.to(`restaurant:${order.restaurantId}`).emit('payment_received', {
      orderId,
      amount,
      method: 'cash',
    });

    res.json({ success: true, message: 'Cash payment recorded.', data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @POST /api/payments/refund
const initiateRefund = async (req, res) => {
  try {
    const { razorpayPaymentId, amount, reason } = req.body;

    const refund = await razorpay.payments.refund(razorpayPaymentId, {
      amount: Math.round(amount * 100),
      notes: { reason },
    });

    res.json({ success: true, message: 'Refund initiated successfully.', data: refund });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @GET /api/payments/history
const getPaymentHistory = async (req, res) => {
  try {
    const { restaurantId, startDate, endDate, page = 1, limit = 20 } = req.query;
    const filter = {
      restaurantId: restaurantId || req.user.restaurantId,
      paymentStatus: 'paid',
    };

    if (startDate && endDate) {
      filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const orders = await Order.find(filter)
      .select('orderNumber totalAmount paymentMethod paymentStatus createdAt tableNumber')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(filter);
    const revenue = await Order.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);

    res.json({
      success: true,
      data: orders,
      revenue: revenue[0]?.total || 0,
      pagination: { page: +page, limit: +limit, total },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createPaymentOrder, verifyPayment, recordCashPayment, initiateRefund, getPaymentHistory };
