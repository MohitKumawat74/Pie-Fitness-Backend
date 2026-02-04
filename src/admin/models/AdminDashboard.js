const mongoose = require('mongoose');

const adminDashboardStatsSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    totalMembers: {
      type: Number,
      default: 0,
    },
    activeMembers: {
      type: Number,
      default: 0,
    },
    monthlyRevenue: {
      type: Number,
      default: 0,
    },
    classesThisWeek: {
      type: Number,
      default: 0,
    },
    newSignups: {
      type: Number,
      default: 0,
    },
    pendingPayments: {
      type: Number,
      default: 0,
    },
    systemAlerts: {
      type: Number,
      default: 0,
    },
    membershipBreakdown: {
      monthly: { type: Number, default: 0 },
      quarterly: { type: Number, default: 0 },
      halfYearly: { type: Number, default: 0 },
      annually: { type: Number, default: 0 },
    },
    revenueBreakdown: {
      memberships: { type: Number, default: 0 },
      classes: { type: Number, default: 0 },
      personal_training: { type: Number, default: 0 },
      merchandise: { type: Number, default: 0 },
    },
    growthMetrics: {
      memberGrowthPercent: { type: Number, default: 0 },
      revenueGrowthPercent: { type: Number, default: 0 },
      classAttendancePercent: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient date-based queries
adminDashboardStatsSchema.index({ date: -1 });
adminDashboardStatsSchema.index({ createdAt: -1 });

// Static method to get current dashboard stats
adminDashboardStatsSchema.statics.getCurrentStats = async function() {
  const RegisterUser = require('../../models/RegisterUser');
  const Payment = require('../../models/Payment');
  const Subscription = require('../../models/Subscription');
  const BookFreeTrial = require('../../models/BookFreeTrial');

  try {
    // Get current date ranges
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    // Total members
    const totalMembers = await RegisterUser.countDocuments({});

    // Active members (users with active subscriptions or recent activity)
    const activeMembers = await RegisterUser.countDocuments({
      $or: [
        { 'subscription.status': 'active' },
        { updatedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
      ]
    });

    // Monthly revenue
    const monthlyRevenue = await Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth },
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

    // Classes this week
    const classesThisWeek = await BookFreeTrial.countDocuments({
      createdAt: { $gte: startOfWeek }
    });

    // New signups this week
    const newSignups = await RegisterUser.countDocuments({
      createdAt: { $gte: startOfWeek }
    });

    // Pending payments
    const pendingPayments = await Payment.countDocuments({
      status: { $in: ['pending', 'processing', 'created'] }
    });

    // System alerts
    const expiredMemberships = await Subscription.countDocuments({
      endDate: { $lt: new Date() },
      status: 'active'
    }).catch(() => 0);

    const failedPayments = await Payment.countDocuments({
      status: 'failed',
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    const systemAlerts = expiredMemberships + failedPayments;

    // Membership breakdown
    const membershipBreakdown = await RegisterUser.aggregate([
      {
        $group: {
          _id: '$membershipPlan',
          count: { $sum: 1 }
        }
      }
    ]);

    const membershipStats = {
      monthly: 0,
      quarterly: 0,
      halfYearly: 0,
      annually: 0
    };

    membershipBreakdown.forEach(item => {
      if (item._id) {
        const planName = item._id.toLowerCase();
        // Map various plan name variations to correct keys
        if (planName.includes('month') || planName === 'monthly') {
          membershipStats.monthly = item.count;
        } else if (planName.includes('quarter') || planName === 'quarterly' || planName === '3 months') {
          membershipStats.quarterly = item.count;
        } else if (planName.includes('half') || planName === 'halfyearly' || planName === 'half yearly' || planName === '6 months') {
          membershipStats.halfYearly = item.count;
        } else if (planName.includes('annual') || planName === 'annually' || planName === 'yearly' || planName === '12 months') {
          membershipStats.annually = item.count;
        }
      }
    });

    // Growth metrics
    const lastMonthMembers = await RegisterUser.countDocuments({
      createdAt: { $lt: startOfMonth }
    });

    const lastMonthRevenue = await Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: lastMonth, $lt: startOfMonth },
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

    const memberGrowthPercent = lastMonthMembers > 0 
      ? ((totalMembers - lastMonthMembers) / lastMonthMembers * 100) 
      : 0;

    const currentRevenue = monthlyRevenue[0]?.total || 0;
    const previousRevenue = lastMonthRevenue[0]?.total || 0;
    const revenueGrowthPercent = previousRevenue > 0 
      ? ((currentRevenue - previousRevenue) / previousRevenue * 100) 
      : 0;

    return {
      totalMembers,
      activeMembers,
      monthlyRevenue: currentRevenue,
      classesThisWeek,
      newSignups,
      pendingPayments,
      systemAlerts,
      membershipBreakdown: membershipStats,
      revenueBreakdown: {
        memberships: currentRevenue * 0.7,
        classes: currentRevenue * 0.2,
        personal_training: currentRevenue * 0.08,
        merchandise: currentRevenue * 0.02,
      },
      growthMetrics: {
        memberGrowthPercent: Math.round(memberGrowthPercent * 100) / 100,
        revenueGrowthPercent: Math.round(revenueGrowthPercent * 100) / 100,
        classAttendancePercent: 85,
      },
    };
  } catch (error) {
    console.error('Error calculating dashboard stats:', error);
    throw error;
  }
};

// Static method to get recent activity
adminDashboardStatsSchema.statics.getRecentActivity = async function() {
  const RegisterUser = require('../../models/RegisterUser');
  const Payment = require('../../models/Payment');
  const BookFreeTrial = require('../../models/BookFreeTrial');

  try {
    const activities = [];

    // Recent user registrations
    const recentUsers = await RegisterUser.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select('fullName createdAt membershipPlan');

    recentUsers.forEach(user => {
      activities.push({
        type: 'user_joined',
        message: `${user.fullName} joined ${user.membershipPlan || 'Monthly'} membership`,
        timestamp: user.createdAt,
        icon: 'user-plus'
      });
    });

    // Recent payments
    const recentPayments = await Payment.find({ 
      status: { $in: ['success', 'paid'] }
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('amount createdAt customerName');

    recentPayments.forEach(payment => {
      activities.push({
        type: 'payment',
        message: `Payment received from ${payment.customerName || 'User'} - ₹${payment.amount}`,
        timestamp: payment.createdAt,
        icon: 'credit-card'
      });
    });

    // Recent class bookings
    const recentBookings = await BookFreeTrial.find({})
      .sort({ createdAt: -1 })
      .limit(3)
      .select('fullName trialType createdAt');

    recentBookings.forEach(booking => {
      activities.push({
        type: 'class_booking',
        message: `${booking.fullName} booked ${booking.trialType || 'Morning Yoga'} class`,
        timestamp: booking.createdAt,
        icon: 'calendar'
      });
    });

    // Sort all activities by timestamp and return latest 10
    return activities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10)
      .map(activity => ({
        ...activity,
        timeAgo: getTimeAgo(activity.timestamp)
      }));

  } catch (error) {
    console.error('Error fetching recent activity:', error);
    throw error;
  }
};

// Helper function to calculate time ago
function getTimeAgo(date) {
  const now = new Date();
  const diff = Math.floor((now - new Date(date)) / 1000);

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 2592000)}mo ago`;
}

// Static method to check if user is admin (first registered user)
adminDashboardStatsSchema.statics.isUserAdmin = async function(userId) {
  try {
    const RegisterUser = require('../../models/RegisterUser');
    
    // Get the first registered user
    const firstUser = await RegisterUser.findOne({})
      .sort({ createdAt: 1 })
      .select('_id');

    return firstUser && firstUser._id.toString() === userId.toString();
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

const AdminDashboard = mongoose.model('AdminDashboard', adminDashboardStatsSchema);

module.exports = AdminDashboard;