const AdminMembership = require('../models/AdminMembership');

class MembershipsController {
  // Get all memberships
  static async getAllMemberships(req, res) {
    try {
      const { isActive, targetAudience } = req.query;
      
      const filters = {};
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      if (targetAudience) filters.targetAudience = targetAudience;

      const memberships = await AdminMembership.getAllMemberships(filters);

      res.status(200).json({
        success: true,
        data: memberships
      });

    } catch (error) {
      console.error('Get all memberships error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch memberships'
      });
    }
  }

  // Get membership by ID
  static async getMembershipById(req, res) {
    try {
      const { membershipId } = req.params;

      const membership = await AdminMembership.getMembershipById(membershipId);

      if (!membership) {
        return res.status(404).json({
          success: false,
          message: 'Membership not found'
        });
      }

      res.status(200).json({
        success: true,
        data: membership
      });

    } catch (error) {
      console.error('Get membership by ID error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch membership'
      });
    }
  }

  // Create new membership
  static async createMembership(req, res) {
    try {
      const membershipData = req.body;

      const newMembership = await AdminMembership.createMembership(membershipData);

      res.status(201).json({
        success: true,
        message: 'Membership created successfully',
        data: newMembership
      });

    } catch (error) {
      console.error('Create membership error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create membership'
      });
    }
  }

  // Update membership
  static async updateMembership(req, res) {
    try {
      const { membershipId } = req.params;
      const updateData = req.body;

      const updatedMembership = await AdminMembership.updateMembership(membershipId, updateData);

      if (!updatedMembership) {
        return res.status(404).json({
          success: false,
          message: 'Membership not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Membership updated successfully',
        data: updatedMembership
      });

    } catch (error) {
      console.error('Update membership error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update membership'
      });
    }
  }

  // Delete membership
  static async deleteMembership(req, res) {
    try {
      const { membershipId } = req.params;

      const deletedMembership = await AdminMembership.deleteMembership(membershipId);

      if (!deletedMembership) {
        return res.status(404).json({
          success: false,
          message: 'Membership not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Membership deleted successfully'
      });

    } catch (error) {
      console.error('Delete membership error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete membership'
      });
    }
  }

  // Get membership statistics
  static async getMembershipStats(req, res) {
    try {
      const stats = await AdminMembership.getMembershipStats();

      res.status(200).json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Get membership stats error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch membership statistics'
      });
    }
  }

  // Bulk actions (delete, activate, deactivate, update)
  static async bulkActions(req, res) {
    try {
      const { action, membershipIds, updateData } = req.body || {};

      if (!action || !Array.isArray(membershipIds) || membershipIds.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid bulk action request' });
      }

      let result;
      switch (action) {
        case 'delete':
          result = await AdminMembership.deleteMany({ _id: { $in: membershipIds } });
          break;
        case 'activate':
          result = await AdminMembership.updateMany({ _id: { $in: membershipIds } }, { isActive: true });
          break;
        case 'deactivate':
          result = await AdminMembership.updateMany({ _id: { $in: membershipIds } }, { isActive: false });
          break;
        case 'update':
          if (!updateData || typeof updateData !== 'object') {
            return res.status(400).json({ success: false, message: 'Invalid update data' });
          }
          result = await AdminMembership.updateMany({ _id: { $in: membershipIds } }, updateData);
          break;
        default:
          return res.status(400).json({ success: false, message: 'Unknown bulk action' });
      }

      res.status(200).json({
        success: true,
        message: `Bulk ${action} completed successfully`,
        data: { result }
      });

    } catch (error) {
      console.error('Bulk membership action error:', error);
      res.status(500).json({ success: false, message: error.message || 'Bulk action failed' });
    }
  }
}

module.exports = MembershipsController;