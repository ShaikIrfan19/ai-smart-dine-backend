// analytics.routes.js
const express = require('express');
const analyticsRouter = express.Router();
const { getDashboardStats, getSuperAdminStats } = require('../controllers/analytics.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

analyticsRouter.use(protect);
analyticsRouter.get('/dashboard', getDashboardStats);
analyticsRouter.get('/super-admin', authorize('super_admin'), getSuperAdminStats);

module.exports = analyticsRouter;
