const express = require('express');
const router = express.Router();
const { logAdminActivity } = require('../middleware/adminMiddleware');
const ReportsController = require('../controllers/reportsController');

// Get users report
router.get('/users',
  logAdminActivity('view', 'users_report'),
  ReportsController.getUsersReport
);

// Get revenue report
router.get('/revenue',
  logAdminActivity('view', 'revenue_report'),
  ReportsController.getRevenueReport
);

// Get subscriptions report
router.get('/subscriptions',
  logAdminActivity('view', 'subscriptions_report'),
  ReportsController.getSubscriptionsReport
);

// Get bookings report
router.get('/bookings',
  logAdminActivity('view', 'bookings_report'),
  ReportsController.getBookingsReport
);

// Get analytics report
router.get('/analytics',
  logAdminActivity('view', 'analytics_report'),
  ReportsController.getAnalyticsReport
);

// Export report
router.get('/export/:reportType',
  logAdminActivity('export', 'report'),
  ReportsController.exportReport
);

// Get report summary
router.get('/summary',
  logAdminActivity('view', 'report_summary'),
  ReportsController.getReportSummary
);

module.exports = router;