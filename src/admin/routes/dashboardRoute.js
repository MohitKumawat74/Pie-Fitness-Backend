const express = require('express');
const router = express.Router();
const { logAdminActivity } = require('../middleware/adminMiddleware');
const DashboardController = require('../controllers/dashboardController');

// Dashboard stats
router.get('/stats',
  logAdminActivity('view', 'dashboard'),
  DashboardController.getStats
);

// Quick stats
router.get('/quick-stats',
  logAdminActivity('view', 'quick_stats'),
  DashboardController.getQuickStats
);

// Recent activity
router.get('/activity',
  logAdminActivity('view', 'recent_activity'),
  DashboardController.getRecentActivity
);

// Analytics
router.get('/analytics',
  logAdminActivity('view', 'analytics'),
  DashboardController.getAnalytics
);

// System alerts
router.get('/alerts',
  logAdminActivity('view', 'system_alerts'),
  DashboardController.getSystemAlerts
);

module.exports = router;