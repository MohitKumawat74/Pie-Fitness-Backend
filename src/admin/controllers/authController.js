const AdminAuth = require('../models/AdminAuth');

class AuthController {
  // Admin login
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      // Validate admin credentials
      const validation = await AdminAuth.validateAdminCredentials(email, password);
      
      if (!validation.success) {
        return res.status(401).json({
          success: false,
          message: validation.message
        });
      }

      const { user } = validation;

      // Update last login
      await AdminAuth.updateLastLogin(user._id);

      // Generate token
      const token = AdminAuth.generateToken(user);
      
      if (!token) {
        return res.status(500).json({
          success: false,
          message: 'Failed to generate authentication token'
        });
      }

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
  }

  // Admin logout
  static async logout(req, res) {
    try {
      // In a JWT system, logout is typically handled client-side by removing the token
      // Server-side logout would require token blacklisting (for enhanced security)
      res.status(200).json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('Admin logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
  }

  // Refresh admin token
  static async refreshToken(req, res) {
    try {
      const userId = req.admin?._id || req.admin?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      // Verify user is still admin
      const isAdmin = await AdminAuth.isUserAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Admin privileges revoked'
        });
      }

      const adminUser = await AdminAuth.getAdminUser();
      
      if (!adminUser) {
        return res.status(404).json({
          success: false,
          message: 'Admin user not found'
        });
      }

      // Generate new token
      const newToken = AdminAuth.generateToken(adminUser);

      if (!newToken) {
        return res.status(500).json({
          success: false,
          message: 'Failed to refresh token'
        });
      }

      res.status(200).json({
        success: true,
        data: {
          token: newToken,
          expiresIn: '24h'
        }
      });

    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({
        success: false,
        message: 'Token refresh failed'
      });
    }
  }

  // Get admin profile
  static async getProfile(req, res) {
    try {
      // Ensure req.admin exists; fall back to AdminAuth.getAdminUser if missing
      const userId = req.admin?._id || req.admin?.userId;

      const adminUser = userId ? await AdminAuth.getAdminUser() : await AdminAuth.getAdminUser();
      
      if (!adminUser) {
        return res.status(404).json({
          success: false,
          message: 'Admin profile not found'
        });
      }

      res.status(200).json({
        success: true,
        data: {
          admin: adminUser,
          isFirstUser: true,
          adminSince: adminUser.createdAt
        }
      });

    } catch (error) {
      console.error('Get admin profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch admin profile'
      });
    }
  }

  // Update admin profile
  static async updateProfile(req, res) {
    try {
      const { fullName, email, phone } = req.body;

      const updateData = {};
      if (fullName) updateData.fullName = fullName;
      if (email) updateData.email = email;
      if (phone) updateData.phone = phone;

      const result = await AdminAuth.updateAdminProfile(updateData);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message
        });
      }

      res.status(200).json({
        success: true,
        message: result.message
      });

    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile'
      });
    }
  }

  // Change admin password
  static async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 8 characters long'
        });
      }

      const result = await AdminAuth.changeAdminPassword(currentPassword, newPassword);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message
        });
      }

      res.status(200).json({
        success: true,
        message: result.message
      });

    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to change password'
      });
    }
  }
}

module.exports = AuthController;