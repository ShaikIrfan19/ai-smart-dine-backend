const Order = require('../models/Order.model');
const Reservation = require('../models/Reservation.model');

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

module.exports = { recordCashPayment, getPaymentHistory };
