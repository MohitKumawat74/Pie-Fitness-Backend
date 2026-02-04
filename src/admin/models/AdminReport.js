const RegisterUser = require('../../models/RegisterUser');
const Payment = require('../../models/Payment');
const BookFreeTrial = require('../../models/BookFreeTrial');
const ContactUsMessage = require('../../models/ContactUsMessage');

class AdminReport {
  // Generate membership reports
  static async getMembershipReport(startDate, endDate, filters = {}) {
    try {
      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);

      // New memberships
      const newMemberships = await RegisterUser.aggregate([
        {
          $match: {
            createdAt: dateFilter,
            ...(filters.membershipPlan && { membershipPlan: filters.membershipPlan })
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              membershipPlan: '$membershipPlan'
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]);

      // Membership distribution
      const membershipDistribution = await RegisterUser.aggregate([
        {
          $match: {
            createdAt: dateFilter,
            isActive: true
          }
        },
        {
          $group: {
            _id: '$membershipPlan',
            count: { $sum: 1 },
            totalRevenue: { $sum: '$subscription.amount' }
          }
        },
        { $sort: { count: -1 } }
      ]);

      // Active vs inactive members
      const memberStatus = await RegisterUser.aggregate([
        {
          $match: { createdAt: dateFilter }
        },
        {
          $group: {
            _id: '$isActive',
            count: { $sum: 1 }
          }
        }
      ]);

      return {
        newMemberships,
        membershipDistribution,
        memberStatus,
        totalMembers: await RegisterUser.countDocuments({ createdAt: dateFilter })
      };
    } catch (error) {
      throw new Error('Failed to generate membership report: ' + error.message);
    }
  }

  // Generate revenue reports
  static async getRevenueReport(startDate, endDate, filters = {}) {
    try {
      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);

      // Revenue by payment method
      const revenueByMethod = await Payment.aggregate([
        {
          $match: {
            createdAt: dateFilter,
            status: { $in: ['success', 'paid'] },
            ...(filters.paymentMethod && { paymentMethod: filters.paymentMethod })
          }
        },
        {
          $group: {
            _id: '$paymentMethod',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 },
            avgAmount: { $avg: '$amount' }
          }
        },
        { $sort: { totalAmount: -1 } }
      ]);

      // Daily revenue trend
      const dailyRevenue = await Payment.aggregate([
        {
          $match: {
            createdAt: dateFilter,
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
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]);

      // Monthly revenue summary
      const monthlyRevenue = await Payment.aggregate([
        {
          $match: {
            createdAt: dateFilter,
            status: { $in: ['success', 'paid'] }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 },
            avgAmount: { $avg: '$amount' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]);

      // Payment status distribution
      const paymentStatus = await Payment.aggregate([
        {
          $match: { createdAt: dateFilter }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ]);

      return {
        revenueByMethod,
        dailyRevenue,
        monthlyRevenue,
        paymentStatus,
        totalRevenue: await Payment.aggregate([
          {
            $match: {
              createdAt: dateFilter,
              status: { $in: ['success', 'paid'] }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' }
            }
          }
        ])
      };
    } catch (error) {
      throw new Error('Failed to generate revenue report: ' + error.message);
    }
  }

  // Generate user activity reports
  static async getUserActivityReport(startDate, endDate, filters = {}) {
    try {
      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);

      // User registrations trend
      const registrationsTrend = await RegisterUser.aggregate([
        {
          $match: { createdAt: dateFilter }
        },
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

      // Free trial bookings
      const freeTrialStats = await BookFreeTrial.aggregate([
        {
          $match: { createdAt: dateFilter }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]);

      // Contact messages trend
      const contactMessagesTrend = await ContactUsMessage.aggregate([
        {
          $match: { createdAt: dateFilter }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]);

      // User engagement metrics
      const lastLoginStats = await RegisterUser.aggregate([
        {
          $match: {
            lastLoginAt: { $exists: true, $ne: null },
            ...(dateFilter.createdAt && { createdAt: dateFilter.createdAt })
          }
        },
        {
          $project: {
            daysSinceLogin: {
              $divide: [
                { $subtract: [new Date(), '$lastLoginAt'] },
                1000 * 60 * 60 * 24
              ]
            }
          }
        },
        {
          $group: {
            _id: {
              $cond: [
                { $lte: ['$daysSinceLogin', 7] },
                'Active (Within 7 days)',
                {
                  $cond: [
                    { $lte: ['$daysSinceLogin', 30] },
                    'Moderately Active (7-30 days)',
                    'Inactive (30+ days)'
                  ]
                }
              ]
            },
            count: { $sum: 1 }
          }
        }
      ]);

      return {
        registrationsTrend,
        freeTrialStats,
        contactMessagesTrend,
        lastLoginStats,
        totalActiveUsers: await RegisterUser.countDocuments({ isActive: true }),
        totalInactiveUsers: await RegisterUser.countDocuments({ isActive: false })
      };
    } catch (error) {
      throw new Error('Failed to generate user activity report: ' + error.message);
    }
  }

  // Generate trainer performance report
  static async getTrainerPerformanceReport(startDate, endDate, filters = {}) {
    try {
      // This would require class attendance tracking
      // For now, return a basic structure
      const AdminTrainer = require('./AdminTrainer');
      const AdminClass = require('./AdminClass');

      const trainers = await AdminTrainer.find({
        status: 'Active'
      }).select('fullName specializations rating assignedClasses');

      const trainerStats = [];

      for (const trainer of trainers) {
        const classes = await AdminClass.find({
          'instructorId': trainer._id
        });

        const totalClasses = classes.length;
        const totalCapacity = classes.reduce((sum, cls) => sum + cls.capacity, 0);
        const totalEnrollment = classes.reduce((sum, cls) => sum + cls.currentEnrollment, 0);
        const utilizationRate = totalCapacity > 0 ? (totalEnrollment / totalCapacity * 100) : 0;

        trainerStats.push({
          trainer: {
            id: trainer._id,
            name: trainer.fullName,
            specializations: trainer.specializations,
            rating: trainer.rating
          },
          performance: {
            totalClasses,
            totalCapacity,
            totalEnrollment,
            utilizationRate: Math.round(utilizationRate * 100) / 100
          }
        });
      }

      return {
        trainerStats: trainerStats.sort((a, b) => b.performance.utilizationRate - a.performance.utilizationRate),
        summary: {
          totalTrainers: trainers.length,
          avgUtilizationRate: trainerStats.reduce((sum, stat) => sum + stat.performance.utilizationRate, 0) / trainerStats.length || 0
        }
      };
    } catch (error) {
      throw new Error('Failed to generate trainer performance report: ' + error.message);
    }
  }

  // Generate financial summary report
  static async getFinancialSummary(startDate, endDate) {
    try {
      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);

      // Total revenue
      const totalRevenue = await Payment.aggregate([
        {
          $match: {
            createdAt: dateFilter,
            status: { $in: ['success', 'paid'] }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 },
            avg: { $avg: '$amount' }
          }
        }
      ]);

      // Revenue by membership type
      const revenueByMembership = await RegisterUser.aggregate([
        {
          $match: {
            createdAt: dateFilter,
            'subscription.amount': { $exists: true }
          }
        },
        {
          $group: {
            _id: '$membershipPlan',
            totalRevenue: { $sum: '$subscription.amount' },
            memberCount: { $sum: 1 }
          }
        },
        { $sort: { totalRevenue: -1 } }
      ]);

      // Growth comparison (current vs previous period)
      const periodLength = endDate && startDate ? 
        (new Date(endDate) - new Date(startDate)) : 
        (30 * 24 * 60 * 60 * 1000); // Default 30 days

      const prevStartDate = new Date(new Date(startDate || new Date()) - periodLength);
      const prevEndDate = new Date(startDate || new Date());

      const previousRevenue = await Payment.aggregate([
        {
          $match: {
            createdAt: { $gte: prevStartDate, $lte: prevEndDate },
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

      const currentTotal = totalRevenue[0]?.total || 0;
      const previousTotal = previousRevenue[0]?.total || 0;
      const growthRate = previousTotal > 0 ? 
        ((currentTotal - previousTotal) / previousTotal * 100) : 0;

      return {
        totalRevenue: totalRevenue[0] || { total: 0, count: 0, avg: 0 },
        revenueByMembership,
        growth: {
          current: currentTotal,
          previous: previousTotal,
          rate: Math.round(growthRate * 100) / 100
        },
        summary: {
          totalTransactions: totalRevenue[0]?.count || 0,
          avgTransactionValue: totalRevenue[0]?.avg || 0,
          totalMembers: await RegisterUser.countDocuments({ createdAt: dateFilter })
        }
      };
    } catch (error) {
      throw new Error('Failed to generate financial summary: ' + error.message);
    }
  }

  // Get custom report data
  static async getCustomReport(reportType, parameters) {
    try {
      switch (reportType) {
        case 'membership_conversion':
          return await this.getMembershipConversionReport(parameters);
        case 'class_popularity':
          return await this.getClassPopularityReport(parameters);
        case 'revenue_forecast':
          return await this.getRevenueForecastReport(parameters);
        default:
          throw new Error('Unknown report type');
      }
    } catch (error) {
      throw new Error('Failed to generate custom report: ' + error.message);
    }
  }

  // Helper method for membership conversion report
  static async getMembershipConversionReport(parameters) {
    const { startDate, endDate } = parameters;
    
    // Free trial to membership conversion
    const freeTrials = await BookFreeTrial.countDocuments({
      createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
    });

    const conversions = await RegisterUser.countDocuments({
      createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
    });

    const conversionRate = freeTrials > 0 ? (conversions / freeTrials * 100) : 0;

    return {
      freeTrials,
      conversions,
      conversionRate: Math.round(conversionRate * 100) / 100
    };
  }
}

module.exports = AdminReport;