const express = require('express');
const router = express.Router();
const Order = require('../models/Order.model');
const { protect, authorize } = require('../middleware/auth.middleware');
const QRCode = require('qrcode');

// Generate bill for order
router.get('/:orderId', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('tableId', 'tableNumber floor')
      .populate('restaurantId', 'name address phone gstNumber logo gstPercentage')
      .populate('customerId', 'name phone')
      .populate('waiterId', 'name');

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Generate QR for receipt
    const receiptQR = await QRCode.toDataURL(`https://aismartdine.com/receipt/${order._id}`);

    const bill = {
      orderNumber: order.orderNumber,
      restaurant: order.restaurantId,
      table: order.tableId,
      customer: order.customerId,
      waiter: order.waiterId,
      items: order.items,
      subtotal: order.subtotal,
      gstPercentage: order.gstPercentage,
      gstAmount: order.gstAmount,
      serviceCharge: order.serviceCharge,
      discount: order.discount,
      couponDiscount: order.couponDiscount,
      totalAmount: order.totalAmount,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt,
      completedAt: order.completedAt,
      receiptQR,
    };

    res.json({ success: true, data: bill });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Apply coupon
router.post('/apply-coupon', protect, async (req, res) => {
  const coupons = {
    'WELCOME50': { discount: 50, type: 'flat', minOrder: 200 },
    'SAVE10': { discount: 10, type: 'percent', minOrder: 100 },
    'FEAST100': { discount: 100, type: 'flat', minOrder: 500 },
  };

  const { code, orderAmount } = req.body;
  const coupon = coupons[code?.toUpperCase()];

  if (!coupon) return res.status(400).json({ success: false, message: 'Invalid coupon code' });
  if (orderAmount < coupon.minOrder) return res.status(400).json({ success: false, message: `Minimum order ₹${coupon.minOrder} required` });

  const discount = coupon.type === 'flat' ? coupon.discount : (orderAmount * coupon.discount) / 100;
  res.json({ success: true, data: { discount, message: `Coupon applied! You saved ₹${discount}` } });
});

module.exports = router;
