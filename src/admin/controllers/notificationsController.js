const mongoose = require('mongoose');
const AdminNotification = require('../models/AdminNotification');

class NotificationsController {
  static async getNotifications(req, res) {
    try {
      const recipientId = req.admin?._id;
      const { isRead, type, page = 1, limit = 20 } = req.query;

      const filters = { recipientType: 'admin' };

      if (typeof isRead !== 'undefined') {
        filters.isRead = String(isRead).toLowerCase() === 'true';
      }

      if (type) {
        filters.type = type;
      }

      const result = await AdminNotification.getNotificationsForRecipient(recipientId, filters, { page, limit });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch notifications'
      });
    }
  }

  static async markAsRead(req, res) {
    try {
      const recipientId = req.admin?._id;
      const { notificationId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(notificationId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid notification id'
        });
      }

      const notification = await AdminNotification.markAsRead(notificationId, recipientId);

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Notification marked as read',
        data: notification
      });
    } catch (error) {
      console.error('Mark notification as read error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to mark notification as read'
      });
    }
  }

  static async markAllAsRead(req, res) {
    try {
      const recipientId = req.admin?._id;
      const result = await AdminNotification.markAllAsRead(recipientId);

      res.status(200).json({
        success: true,
        message: 'All notifications marked as read',
        data: result
      });
    } catch (error) {
      console.error('Mark all notifications as read error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to mark all notifications as read'
      });
    }
  }

  static async deleteNotification(req, res) {
    try {
      const recipientId = req.admin?._id;
      const { notificationId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(notificationId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid notification id'
        });
      }

      const deletedNotification = await AdminNotification.deleteNotification(notificationId, recipientId);

      if (!deletedNotification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Notification deleted successfully'
      });
    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete notification'
      });
    }
  }
}

module.exports = NotificationsController;