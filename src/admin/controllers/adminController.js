const AdminDashboard = require('../models/AdminDashboard');
const RegisterUser = require('../../models/RegisterUser');
const Payment = require('../../models/Payment');
const Subscription = require('../../models/Subscription');
const BookFreeTrial = require('../../models/BookFreeTrial');
const ContactUsMessage = require('../../models/ContactUsMessage');
const jwt = require('jsonwebtoken');

// Helper function to generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'default_secret',
    { expiresIn: '24h' }
  );
};

// Admin Authentication (First User Login)
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user by email
    const user = await RegisterUser.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated.'
      });
    }

    // Verify password
    const isPasswordValid = user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if this user is admin (first registered user)
    const isAdmin = await AdminDashboard.isUserAdmin(user._id);
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Admin login successful',
      token,
      admin: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        username: user.username,
        lastLogin: user.lastLoginAt,
        profileImage: user.image,
        isFirstUser: true
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get Dashboard Stats
const getDashboardStats = async (req, res) => {
  try {
    const stats = await AdminDashboard.getCurrentStats();
    const recentActivity = await AdminDashboard.getRecentActivity();

    res.status(200).json({
      success: true,
      data: {
        stats,
        recentActivity
      }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics'
    });
  }
};

// Get Quick Stats
const getQuickStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalMembers,
      activeMembers,
      weeklySignups,
      monthlyRevenue,
      pendingPayments,
      weeklyClasses
    ] = await Promise.all([
      RegisterUser.countDocuments({}),
      RegisterUser.countDocuments({
        $or: [
          { 'subscription.status': 'active' },
          { updatedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
        ]
      }),
      RegisterUser.countDocuments({ createdAt: { $gte: startOfWeek } }),
      Payment.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfMonth },
            status: { $in: ['success', 'paid'] }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Payment.countDocuments({ status: { $in: ['pending', 'processing', 'created'] } }),
      BookFreeTrial.countDocuments({ createdAt: { $gte: startOfWeek } })
    ]);

    res.json({
      success: true,
      data: {
        totalMembers,
        activeMembers,
        weeklySignups,
        monthlyRevenue: monthlyRevenue[0]?.total || 0,
        pendingPayments,
        weeklyClasses
      }
    });
  } catch (error) {
    console.error('Quick stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch quick stats' 
    });
  }
};

// User Management
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, membership } = req.query;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }
    if (membership) {
      filter.membershipPlan = membership;
    }

    const users = await RegisterUser.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalUsers = await RegisterUser.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(totalUsers / limit),
          total: totalUsers
        }
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await RegisterUser.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's payment history
    const payments = await Payment.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10);

    // Get user's subscription history
    const subscriptions = await Subscription.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .catch(() => []); // Handle if Subscription model doesn't exist

    res.status(200).json({
      success: true,
      data: {
        user,
        payments,
        subscriptions
      }
    });

  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user details'
    });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { action, reason } = req.body;

    const user = await RegisterUser.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from deactivating themselves
    if (userId === req.admin._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify your own admin account'
      });
    }

    let updateData = {};
    let message = '';

    switch (action) {
      case 'activate':
        updateData = { 
          isActive: true,
          suspendedAt: null,
          suspendReason: null
        };
        message = 'User activated successfully';
        break;
      case 'deactivate':
        updateData = { isActive: false };
        message = 'User deactivated successfully';
        break;
      case 'suspend':
        updateData = { 
          isActive: false, 
          suspendedAt: new Date(),
          suspendReason: reason || 'No reason provided'
        };
        message = 'User suspended successfully';
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action'
        });
    }

    await RegisterUser.findByIdAndUpdate(userId, updateData);

    res.status(200).json({
      success: true,
      message
    });

  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status'
    });
  }
};

// Payment Management
const getAllPayments = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, dateFrom, dateTo } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (status) filter.status = status;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const payments = await Payment.find(filter)
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalPayments = await Payment.countDocuments(filter);

    // Calculate totals
    const totalAmount = await Payment.aggregate([
      { $match: { ...filter, status: { $in: ['success', 'paid'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        payments,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(totalPayments / limit),
          total: totalPayments
        },
        summary: {
          totalAmount: totalAmount[0]?.total || 0,
          totalTransactions: totalPayments
        }
      }
    });

  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments'
    });
  }
};

// Contact Messages
const getContactMessages = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (status) filter.status = status;

    const messages = await ContactUsMessage.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalMessages = await ContactUsMessage.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        messages,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(totalMessages / limit),
          total: totalMessages
        }
      }
    });

  } catch (error) {
    console.error('Get contact messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contact messages'
    });
  }
};

const updateMessageStatus = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { status, response } = req.body;

    const message = await ContactUsMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    const updateData = { status };
    if (response) {
      updateData.response = response;
      updateData.respondedAt = new Date();
      updateData.respondedBy = req.admin._id;
    }

    await ContactUsMessage.findByIdAndUpdate(messageId, updateData);

    res.status(200).json({
      success: true,
      message: 'Message status updated successfully'
    });

  } catch (error) {
    console.error('Update message status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update message status'
    });
  }
};

// System Alerts
const getSystemAlerts = async (req, res) => {
  try {
    const alerts = [];

    // Check for expired memberships
    const expiredMemberships = await Subscription.countDocuments({
      endDate: { $lt: new Date() },
      status: 'active'
    }).catch(() => 0);

    if (expiredMemberships > 0) {
      alerts.push({
        type: 'warning',
        message: `${expiredMemberships} memberships have expired`,
        action: 'review_memberships'
      });
    }

    // Check for failed payments in last 7 days
    const failedPayments = await Payment.countDocuments({
      status: 'failed',
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    if (failedPayments > 0) {
      alerts.push({
        type: 'error',
        message: `${failedPayments} failed payments in the last 7 days`,
        action: 'review_payments'
      });
    }

    // Check for pending payments
    const pendingPayments = await Payment.countDocuments({
      status: { $in: ['pending', 'created'] }
    });

    if (pendingPayments > 5) {
      alerts.push({
        type: 'info',
        message: `${pendingPayments} payments are pending review`,
        action: 'review_pending_payments'
      });
    }

    res.json({
      success: true,
      data: {
        alerts,
        count: alerts.length
      }
    });

  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch alerts' 
    });
  }
};

module.exports = {
  adminLogin,
  getDashboardStats,
  getQuickStats,
  getAllUsers,
  getUserById,
  updateUserStatus,
  getAllPayments,
  getContactMessages,
  updateMessageStatus,
  getSystemAlerts
};