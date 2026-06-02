const Order = require('../models/Order.model');
const Table = require('../models/Table.model');
const MenuItem = require('../models/MenuItem.model');

// @POST /api/orders
const createOrder = async (req, res) => {
  try {
    const { restaurantId, tableId, items, notes, orderType } = req.body;
    const io = req.app.get('io');

    // Validate items and calculate prices
    let subtotal = 0;
    const processedItems = [];

    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItemId);
      if (!menuItem || !menuItem.isAvailable) {
        return res.status(400).json({ success: false, message: `Item "${item.name}" is not available.` });
      }

      const addonTotal = (item.addons || []).reduce((sum, a) => sum + (a.price || 0), 0);
      const itemPrice = menuItem.price + addonTotal;
      const totalPrice = itemPrice * item.quantity;
      subtotal += totalPrice;

      processedItems.push({
        menuItemId: item.menuItemId,
        name: menuItem.name,
        price: itemPrice,
        quantity: item.quantity,
        totalPrice,
        notes: item.notes,
        addons: item.addons || [],
        isVeg: menuItem.isVeg,
        image: menuItem.image,
      });

      // Update total orders count
      await MenuItem.findByIdAndUpdate(item.menuItemId, { $inc: { totalOrders: item.quantity } });
    }

    // Get restaurant GST
    const Restaurant = require('../models/Restaurant.model');
    const restaurant = await Restaurant.findById(restaurantId);
    const gstPercentage = restaurant?.gstPercentage || 18;
    const gstAmount = (subtotal * gstPercentage) / 100;
    const totalAmount = subtotal + gstAmount;

    // Get table number
    const table = await Table.findById(tableId);

    const order = await Order.create({
      restaurantId,
      tableId,
      tableNumber: table?.tableNumber,
      customerId: req.user.role === 'customer' ? req.user._id : null,
      waiterId: req.user.role === 'waiter' ? req.user._id : null,
      items: processedItems,
      subtotal,
      gstAmount,
      gstPercentage,
      totalAmount,
      notes,
      orderType: orderType || 'dine_in',
      estimatedTime: processedItems.reduce((max, i) => {
        const prep = 15; // default
        return Math.max(max, prep);
      }, 0),
    });

    // Update table status
    await Table.findByIdAndUpdate(tableId, {
      status: 'occupied',
      currentOrderId: order._id,
      occupiedSince: new Date(),
    });

    // Real-time notification
    io.to(`restaurant:${restaurantId}`).emit('new_order', {
      order,
      table: table?.tableNumber,
      message: `New order from Table ${table?.tableNumber}`,
    });

    const populated = await Order.findById(order._id).populate('tableId', 'tableNumber').populate('customerId', 'name');

    res.status(201).json({ success: true, message: 'Order placed successfully', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @GET /api/orders?restaurantId=&status=&tableId=
const getOrders = async (req, res) => {
  try {
    const { restaurantId, status, tableId, date, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (restaurantId) filter.restaurantId = restaurantId;
    else if (req.user.role !== 'super_admin') filter.restaurantId = req.user.restaurantId;

    if (status) filter.status = status;
    if (tableId) filter.tableId = tableId;
    if (req.user.role === 'waiter') filter.waiterId = req.user._id;
    if (req.user.role === 'customer') filter.customerId = req.user._id;

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: start, $lte: end };
    }

    const orders = await Order.find(filter)
      .populate('tableId', 'tableNumber floor')
      .populate('customerId', 'name phone')
      .populate('waiterId', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(filter);

    res.json({ success: true, data: orders, pagination: { page: +page, limit: +limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @PATCH /api/orders/:id/status
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const io = req.app.get('io');

    const order = await Order.findByIdAndUpdate(req.params.id, { status, ...(status === 'completed' ? { completedAt: new Date() } : {}) }, { new: true });

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // If completed, free up the table
    if (status === 'completed' || status === 'cancelled') {
      await Table.findByIdAndUpdate(order.tableId, {
        status: 'cleaning',
        currentOrderId: null,
        currentCustomerCount: 0,
      });
    }

    // Real-time update
    io.to(`restaurant:${order.restaurantId}`).emit('order_status_updated', {
      orderId: order._id,
      status,
      tableId: order.tableId,
    });

    // Notify customer if applicable
    if (order.customerId) {
      io.to(`user:${order.customerId}`).emit('your_order_updated', { orderId: order._id, status });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @GET /api/orders/live
const getLiveOrders = async (req, res) => {
  try {
    const restaurantId = req.query.restaurantId || req.user.restaurantId;
    const orders = await Order.find({
      restaurantId,
      status: { $in: ['pending', 'confirmed', 'preparing', 'ready'] },
    })
      .populate('tableId', 'tableNumber')
      .populate('waiterId', 'name')
      .sort({ createdAt: 1 });

    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @POST /api/orders/:id/items — Add items to existing order
const addItemsToOrder = async (req, res) => {
  try {
    const { items } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    let additionalTotal = 0;
    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItemId);
      if (!menuItem) continue;
      const totalPrice = menuItem.price * item.quantity;
      additionalTotal += totalPrice;
      order.items.push({ ...item, name: menuItem.name, price: menuItem.price, totalPrice, isVeg: menuItem.isVeg });
    }

    order.subtotal += additionalTotal;
    const gstAmount = (order.subtotal * order.gstPercentage) / 100;
    order.gstAmount = gstAmount;
    order.totalAmount = order.subtotal + gstAmount - order.discount;
    await order.save();

    req.app.get('io').to(`restaurant:${order.restaurantId}`).emit('order_updated', order);
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createOrder, getOrders, updateOrderStatus, getLiveOrders, addItemsToOrder };
