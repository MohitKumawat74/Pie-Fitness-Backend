const mongoose = require('mongoose');
const RegisterUser = require('../../models/RegisterUser');
const jwt = require('jsonwebtoken');

class AdminAuth {
  // Check if user is admin (first registered user)
  static async isUserAdmin(userId) {
    try {
      const firstUser = await RegisterUser.findOne({}).sort({ createdAt: 1 });
      return firstUser && firstUser._id.toString() === userId.toString();
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  // Get first user (admin)
  static async getAdminUser() {
    try {
      return await RegisterUser.findOne({})
        .sort({ createdAt: 1 })
        .select('-password');
    } catch (error) {
      console.error('Error getting admin user:', error);
      return null;
    }
  }

  // Validate admin credentials
  static async validateAdminCredentials(email, password) {
    try {
      // Find user by email
      const user = await RegisterUser.findOne({ email: email.toLowerCase() });
      if (!user) {
        return { success: false, message: 'Invalid email or password' };
      }

      // Check if user account is active
      if (!user.isActive) {
        return { success: false, message: 'Account is deactivated' };
      }

      // Verify password
      const isPasswordValid = user.comparePassword(password);
      if (!isPasswordValid) {
        return { success: false, message: 'Invalid email or password' };
      }

      // Check if this user is admin
      const isAdmin = await this.isUserAdmin(user._id);
      if (!isAdmin) {
        return { success: false, message: 'Access denied. Admin privileges required' };
      }

      return { success: true, user };
    } catch (error) {
      console.error('Error validating admin credentials:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // Generate JWT token for admin
  static generateToken(user) {
    try {
      return jwt.sign(
        { 
          userId: user._id,
          email: user.email,
          isAdmin: true 
        },
        process.env.JWT_SECRET || 'default_secret',
        { expiresIn: '24h' }
      );
    } catch (error) {
      console.error('Error generating token:', error);
      return null;
    }
  }

  // Verify JWT token
  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
    } catch (error) {
      console.error('Error verifying token:', error);
      return null;
    }
  }

  // Update admin profile
  static async updateAdminProfile(updateData) {
    try {
      const firstUser = await RegisterUser.findOne({}).sort({ createdAt: 1 });
      
      if (!firstUser) {
        return { success: false, message: 'Admin user not found' };
      }

      // Update profile data
      const validFields = ['fullName', 'email', 'phone'];
      const fieldsToUpdate = {};
      
      validFields.forEach(field => {
        if (updateData[field] !== undefined) {
          fieldsToUpdate[field] = updateData[field];
        }
      });

      if (fieldsToUpdate.email) {
        fieldsToUpdate.email = fieldsToUpdate.email.toLowerCase();
      }

      await RegisterUser.findByIdAndUpdate(firstUser._id, fieldsToUpdate);

      return { success: true, message: 'Profile updated successfully' };
    } catch (error) {
      console.error('Error updating admin profile:', error);
      return { success: false, message: 'Failed to update profile' };
    }
  }

  // Change admin password
  static async changeAdminPassword(currentPassword, newPassword) {
    try {
      const firstUser = await RegisterUser.findOne({}).sort({ createdAt: 1 });
      
      if (!firstUser) {
        return { success: false, message: 'Admin user not found' };
      }

      // Verify current password
      const isCurrentPasswordValid = firstUser.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return { success: false, message: 'Current password is incorrect' };
      }

      // Update password
      firstUser.password = newPassword;
      firstUser._confirmPassword = newPassword;
      await firstUser.save();

      return { success: true, message: 'Password changed successfully' };
    } catch (error) {
      console.error('Error changing admin password:', error);
      return { success: false, message: 'Failed to change password' };
    }
  }

  // Update last login
  static async updateLastLogin(userId) {
    try {
      await RegisterUser.findByIdAndUpdate(userId, { lastLoginAt: new Date() });
      return true;
    } catch (error) {
      console.error('Error updating last login:', error);
      return false;
    }
  }
}

module.exports = AdminAuth;