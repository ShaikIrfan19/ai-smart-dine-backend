const Order = require('../models/Order.model');
const Reservation = require('../models/Reservation.model');
const Table = require('../models/Table.model');
const User = require('../models/User.model');
const Restaurant = require('../models/Restaurant.model');
const mongoose = require('mongoose');

// @GET /api/analytics/dashboard?restaurantId=&period=today|week|month
const getDashboardStats = async (req, res) => {
  try {
    const { restaurantId, period = 'today' } = req.query;
    const rid = restaurantId || req.user.restaurantId?.toString();

    const now = new Date();
    let startDate = new Date();
    if (period === 'today') startDate.setHours(0, 0, 0, 0);
    else if (period === 'week') startDate.setDate(now.getDate() - 7);
    else if (period === 'month') startDate.setMonth(now.getMonth() - 1);
    else if (period === 'year') startDate.setFullYear(now.getFullYear() - 1);

    const matchFilter = {
      restaurantId: mongoose.Types.ObjectId.createFromHexString(rid),
      createdAt: { $gte: startDate },
    };

    const [
      revenueData,
      orderStats,
      tableStats,
      topDishes,
      customerCount,
      reservationStats,
      hourlyOrders,
      paymentMethods,
    ] = await Promise.all([
      Order.aggregate([
        { $match: { ...matchFilter, paymentStatus: 'paid' } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$totalAmount' }, orders: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Table.aggregate([
        { $match: { restaurantId: mongoose.Types.ObjectId.createFromHexString(rid) } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: matchFilter },
        { $unwind: '$items' },
        { $group: { _id: '$items.name', count: { $sum: '$items.quantity' }, revenue: { $sum: '$items.totalPrice' } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Order.distinct('customerId', { ...matchFilter, customerId: { $ne: null } }),
      Reservation.aggregate([
        { $match: { ...matchFilter } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { ...matchFilter } },
        { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $match: { ...matchFilter, paymentStatus: 'paid' } },
        { $group: { _id: '$paymentMethod', count: { $sum: 1 }, amount: { $sum: '$totalAmount' } } },
      ]),
    ]);

    const totalRevenue = revenueData.reduce((s, d) => s + d.revenue, 0);
    const totalOrders = orderStats.reduce((s, o) => s + o.count, 0);
    const completedOrders = orderStats.find(o => o._id === 'completed')?.count || 0;

    res.json({
      success: true,
      data: {
        revenue: { total: totalRevenue, chart: revenueData },
        orders: { total: totalOrders, completed: completedOrders, byStatus: orderStats },
        tables: { byStatus: tableStats },
        topDishes,
        uniqueCustomers: customerCount.length,
        reservations: reservationStats,
        hourlyOrders,
        paymentMethods,
        period,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @GET /api/analytics/super-admin — For Super Admin
const getSuperAdminStats = async (req, res) => {
  try {
    const [
      totalRestaurants,
      activeRestaurants,
      totalRevenue,
      totalOrders,
      recentRestaurants,
      topRestaurants,
    ] = await Promise.all([
      Restaurant.countDocuments(),
      Restaurant.countDocuments({ isActive: true }),
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Order.countDocuments(),
      Restaurant.find().sort({ createdAt: -1 }).limit(5).select('name city restaurantType createdAt isActive'),
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: '$restaurantId', revenue: { $sum: '$totalAmount' }, orders: { $sum: 1 } } },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'restaurants', localField: '_id', foreignField: '_id', as: 'restaurant' } },
        { $unwind: '$restaurant' },
        { $project: { name: '$restaurant.name', revenue: 1, orders: 1 } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        totalRestaurants,
        activeRestaurants,
        totalRevenue: totalRevenue[0]?.total || 0,
        totalOrders,
        recentRestaurants,
        topRestaurants,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getDashboardStats, getSuperAdminStats };
