const express = require('express');
const router = express.Router();

const {
  authenticateAdmin,
  adminRateLimit
} = require('../middleware/adminMiddleware');

// Import all sub-routes
const authRoute = require('./authRoute');
const dashboardRoute = require('./dashboardRoute');
const usersRoute = require('./usersRoute');
const classesRoute = require('./classesRoute');
const trainersRoute = require('./trainersRoute');
const membershipsRoute = require('./membershipsRoute');
const plansRoute = require('./plansRoute');
const settingsRoute = require('./settingsRoute');
const reportsRoute = require('./reportsRoute');
const systemRoute = require('./systemRoute');
const notificationsRoute = require('./notificationsRoute');

// Auth routes (no authentication required)
router.use('/auth', authRoute);

// System health check (no auth required)
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Admin system is healthy',
    timestamp: new Date().toISOString()
  });
});

// Apply authentication to all other routes
router.use(authenticateAdmin);

// Mount all protected routes
router.use('/dashboard', dashboardRoute);
router.use('/users', usersRoute);
router.use('/classes', classesRoute);
router.use('/trainers', trainersRoute);
router.use('/memberships', membershipsRoute);
router.use('/plans', plansRoute);
router.use('/settings', settingsRoute);
router.use('/reports', reportsRoute);
router.use('/system', systemRoute);
router.use('/notifications', notificationsRoute);

module.exports = router;