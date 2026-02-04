const AdminDashboard = require('../models/AdminDashboard');

class DashboardController {
  // Get dashboard statistics
  static async getStats(req, res) {
    try {
      const stats = await AdminDashboard.getCurrentStats();
      
      res.status(200).json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard statistics'
      });
    }
  }

  // Get analytics data
  static async getAnalytics(req, res) {
    try {
      const { period = '30d' } = req.query;
      
      let dateRange = {};
      const now = new Date();
      
      switch (period) {
        case '7d':
          dateRange = { $gte: new Date(now.setDate(now.getDate() - 7)) };
          break;
        case '30d':
          dateRange = { $gte: new Date(now.setDate(now.getDate() - 30)) };
          break;
        case '90d':
          dateRange = { $gte: new Date(now.setDate(now.getDate() - 90)) };
          break;
        case '1y':
          dateRange = { $gte: new Date(now.setFullYear(now.getFullYear() - 1)) };
          break;
        default:
          dateRange = { $gte: new Date(now.setDate(now.getDate() - 30)) };
      }

      const RegisterUser = require('../../models/RegisterUser');
      const Payment = require('../../models/Payment');

      // User growth analytics
      const userGrowth = await RegisterUser.aggregate([
        { $match: { createdAt: dateRange } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]);

      // Revenue analytics
      const revenueAnalytics = await Payment.aggregate([
        { 
          $match: { 
            createdAt: dateRange,
            status: { $in: ['success', 'paid'] }
          } 
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            revenue: { $sum: '$amount' },
            transactions: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]);

      // Top membership plans
      const membershipAnalytics = await RegisterUser.aggregate([
        {
          $group: {
            _id: '$membershipPlan',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);

      res.status(200).json({
        success: true,
        data: {
          userGrowth,
          revenueAnalytics,
          membershipAnalytics,
          period
        }
      });

    } catch (error) {
      console.error('Get analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch analytics'
      });
    }
  }

  // Get recent activity
  static async getRecentActivity(req, res) {
    try {
      const { limit = 10 } = req.query;
      
      const recentActivity = await AdminDashboard.getRecentActivity(parseInt(limit));
      
      res.status(200).json({
        success: true,
        data: recentActivity
      });

    } catch (error) {
      console.error('Get recent activity error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch recent activity'
      });
    }
  }

  // Get system alerts
  static async getSystemAlerts(req, res) {
    try {
      const RegisterUser = require('../../models/RegisterUser');
      const Payment = require('../../models/Payment');
      const ContactUsMessage = require('../../models/ContactUsMessage');

      const alerts = [];
      
      // Check for unread messages
      const unreadMessages = await ContactUsMessage.countDocuments({ 
        status: { $ne: 'resolved' }
      });
      
      if (unreadMessages > 0) {
        alerts.push({
          type: 'warning',
          title: 'Unread Messages',
          message: `You have ${unreadMessages} unread contact messages`,
          action: '/admin/messages',
          priority: 'medium'
        });
      }

      // Check for failed payments
      const failedPayments = await Payment.countDocuments({
        status: 'failed',
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });

      if (failedPayments > 0) {
        alerts.push({
          type: 'error',
          title: 'Failed Payments',
          message: `${failedPayments} payment(s) failed in the last 24 hours`,
          action: '/admin/payments?status=failed',
          priority: 'high'
        });
      }

      // Check for new user registrations today
      const newUsersToday = await RegisterUser.countDocuments({
        createdAt: { 
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lte: new Date(new Date().setHours(23, 59, 59, 999))
        }
      });

      if (newUsersToday > 5) {
        alerts.push({
          type: 'info',
          title: 'High Registration Activity',
          message: `${newUsersToday} new users registered today`,
          action: '/admin/users?filter=today',
          priority: 'low'
        });
      }

      res.status(200).json({
        success: true,
        data: {
          alerts,
          totalCount: alerts.length
        }
      });

    } catch (error) {
      console.error('Get system alerts error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch system alerts'
      });
    }
  }

  // Get quick stats
  static async getQuickStats(req, res) {
    try {
      const RegisterUser = require('../../models/RegisterUser');
      const Payment = require('../../models/Payment');

      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      const quickStats = {
        todayRegistrations: await RegisterUser.countDocuments({
          createdAt: { $gte: startOfDay, $lte: endOfDay }
        }),
        todayRevenue: 0,
        activeUsers: await RegisterUser.countDocuments({ isActive: true }),
        totalRevenue: 0
      };

      // Calculate today's revenue
      const todayRevenueResult = await Payment.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfDay, $lte: endOfDay },
            status: { $in: ['success', 'paid'] }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      quickStats.todayRevenue = todayRevenueResult[0]?.total || 0;

      // Calculate total revenue
      const totalRevenueResult = await Payment.aggregate([
        {
          $match: {
            status: { $in: ['success', 'paid'] }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      quickStats.totalRevenue = totalRevenueResult[0]?.total || 0;

      res.status(200).json({
        success: true,
        data: quickStats
      });

    } catch (error) {
      console.error('Get quick stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch quick statistics'
      });
    }
  }
}

module.exports = DashboardController;