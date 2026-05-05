const express = require('express');
const router = express.Router();
const { logAdminActivity } = require('../middleware/adminMiddleware');
const NotificationsController = require('../controllers/notificationsController');

router.get('/',
  logAdminActivity('view', 'notifications'),
  NotificationsController.getNotifications
);

router.patch('/read-all',
  logAdminActivity('update', 'notifications'),
  NotificationsController.markAllAsRead
);

router.patch('/:notificationId/read',
  logAdminActivity('update', 'notification'),
  NotificationsController.markAsRead
);

router.delete('/:notificationId',
  logAdminActivity('delete', 'notification'),
  NotificationsController.deleteNotification
);

module.exports = router;