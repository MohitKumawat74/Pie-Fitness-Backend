const RegisterUser = require('../../models/RegisterUser');

class UsersController {
  // Get all users
  static async getAllUsers(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        search = '', 
        membershipPlan = '',
        isActive = '',
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const query = {};

      // Apply filters
      if (search) {
        query.$or = [
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { username: { $regex: search, $options: 'i' } }
        ];
      }

      if (membershipPlan) {
        query.membershipPlan = membershipPlan;
      }

      if (isActive !== '') {
        query.isActive = isActive === 'true';
      }

      // Create sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Execute query
      const users = await RegisterUser.find(query)
        .select('-password')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

      const totalUsers = await RegisterUser.countDocuments(query);
      const totalPages = Math.ceil(totalUsers / parseInt(limit));

      res.status(200).json({
        success: true,
        data: {
          users,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalUsers,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      });

    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users'
      });
    }
  }

  // Get user by ID
  static async getUserById(req, res) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      const user = await RegisterUser.findById(userId).select('-password');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Get user's payment history
      const Payment = require('../../models/Payment');
      const payments = await Payment.find({ userId })
        .sort({ createdAt: -1 })
        .limit(10);

      res.status(200).json({
        success: true,
        data: {
          user,
          paymentHistory: payments
        }
      });

    } catch (error) {
      console.error('Get user by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user details'
      });
    }
  }

  // Update user
  static async updateUser(req, res) {
    try {
      const { userId } = req.params;
      const updateData = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      // Remove sensitive fields that shouldn't be updated directly
      delete updateData.password;
      delete updateData._id;
      delete updateData.createdAt;
      delete updateData.updatedAt;

      const updatedUser = await RegisterUser.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
      ).select('-password');

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: updatedUser
      });

    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user'
      });
    }
  }

  // Delete user
  static async deleteUser(req, res) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      const user = await RegisterUser.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if user is the admin (first user)
      const AdminDashboard = require('../models/AdminDashboard');
      const isAdmin = await AdminDashboard.isUserAdmin(userId);

      if (isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Cannot delete admin user'
        });
      }

      await RegisterUser.findByIdAndDelete(userId);

      res.status(200).json({
        success: true,
        message: 'User deleted successfully'
      });

    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete user'
      });
    }
  }

  // Update user status (activate/deactivate)
  static async updateUserStatus(req, res) {
    try {
      const { userId } = req.params;
      const { isActive, suspendReason = null } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      if (typeof isActive !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'isActive must be a boolean value'
        });
      }

      // Check if user is the admin (first user)
      const AdminDashboard = require('../models/AdminDashboard');
      const isAdmin = await AdminDashboard.isUserAdmin(userId);

      if (isAdmin && !isActive) {
        return res.status(403).json({
          success: false,
          message: 'Cannot deactivate admin user'
        });
      }

      const updateData = { 
        isActive,
        suspendedAt: !isActive ? new Date() : null,
        suspendReason: !isActive ? suspendReason : null
      };

      const updatedUser = await RegisterUser.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
      ).select('-password');

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.status(200).json({
        success: true,
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
        data: updatedUser
      });

    } catch (error) {
      console.error('Update user status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user status'
      });
    }
  }

  // Get user statistics
  static async getUserStats(req, res) {
    try {
      const stats = {
        total: await RegisterUser.countDocuments(),
        active: await RegisterUser.countDocuments({ isActive: true }),
        inactive: await RegisterUser.countDocuments({ isActive: false }),
        byMembership: {},
        recentRegistrations: {}
      };

      // Get membership distribution
      const membershipStats = await RegisterUser.aggregate([
        {
          $group: {
            _id: '$membershipPlan',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);

      stats.byMembership = membershipStats.reduce((acc, item) => {
        acc[item._id || 'unknown'] = item.count;
        return acc;
      }, {});

      // Get recent registrations (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentRegistrations = await RegisterUser.aggregate([
        {
          $match: {
            createdAt: { $gte: sevenDaysAgo }
          }
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

      stats.recentRegistrations = recentRegistrations;

      res.status(200).json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user statistics'
      });
    }
  }

  // Search users
  static async searchUsers(req, res) {
    try {
      const { q, limit = 10 } = req.query;

      if (!q || q.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Search query must be at least 2 characters'
        });
      }

      const users = await RegisterUser.find({
        $or: [
          { fullName: { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } },
          { username: { $regex: q, $options: 'i' } }
        ]
      })
      .select('fullName email username membershipPlan isActive')
      .limit(parseInt(limit));

      res.status(200).json({
        success: true,
        data: users
      });

    } catch (error) {
      console.error('Search users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search users'
      });
    }
  }

  // Export users data
  static async exportUsers(req, res) {
    try {
      const { format = 'json' } = req.query;

      const users = await RegisterUser.find({})
        .select('-password')
        .sort({ createdAt: -1 });

      if (format === 'csv') {
        // Convert to CSV format
        const csvHeader = 'Full Name,Email,Username,Membership Plan,Active,Join Date,Last Login\n';
        const csvData = users.map(user => 
          `"${user.fullName}","${user.email}","${user.username || ''}","${user.membershipPlan}","${user.isActive}","${user.createdAt}","${user.lastLoginAt || ''}"`
        ).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
        res.send(csvHeader + csvData);
      } else {
        res.status(200).json({
          success: true,
          data: users
        });
      }

    } catch (error) {
      console.error('Export users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export users data'
      });
    }
  }
}

module.exports = UsersController;