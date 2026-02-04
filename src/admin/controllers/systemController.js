const AdminSystem = require('../models/AdminSystem');

class SystemController {
  // Get system health
  static async getSystemHealth(req, res) {
    try {
      const health = await AdminSystem.getSystemHealth();

      res.status(200).json({
        success: true,
        data: health
      });

    } catch (error) {
      console.error('Get system health error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get system health'
      });
    }
  }

  // Get system logs
  static async getSystemLogs(req, res) {
    try {
      const options = {
        level: req.query.level || 'all',
        limit: parseInt(req.query.limit) || 100,
        offset: parseInt(req.query.offset) || 0,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const logs = await AdminSystem.getSystemLogs(options);

      res.status(200).json({
        success: true,
        data: logs
      });

    } catch (error) {
      console.error('Get system logs error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get system logs'
      });
    }
  }

  // Create system backup
  static async createBackup(req, res) {
    try {
      const options = {
        includeDatabase: req.body.includeDatabase !== false,
        includeUploads: req.body.includeUploads !== false,
        compression: req.body.compression !== false
      };

      const backup = await AdminSystem.createBackup(options);

      res.status(200).json({
        success: true,
        message: 'Backup created successfully',
        data: backup
      });

    } catch (error) {
      console.error('Create backup error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create backup'
      });
    }
  }

  // List backups
  static async listBackups(req, res) {
    try {
      const backups = await AdminSystem.listBackups();

      res.status(200).json({
        success: true,
        data: backups
      });

    } catch (error) {
      console.error('List backups error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to list backups'
      });
    }
  }

  // Delete backup
  static async deleteBackup(req, res) {
    try {
      const { backupId } = req.params;

      if (!backupId) {
        return res.status(400).json({
          success: false,
          message: 'Backup ID is required'
        });
      }

      const result = await AdminSystem.deleteBackup(backupId);

      res.status(200).json({
        success: true,
        message: result.message
      });

    } catch (error) {
      console.error('Delete backup error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete backup'
      });
    }
  }

  // Set maintenance mode
  static async setMaintenanceMode(req, res) {
    try {
      const { enabled, message } = req.body;

      if (typeof enabled !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'Enabled must be a boolean value'
        });
      }

      const result = await AdminSystem.setMaintenanceMode(enabled, message);

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Set maintenance mode error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to set maintenance mode'
      });
    }
  }

  // Get maintenance status
  static async getMaintenanceStatus(req, res) {
    try {
      const status = await AdminSystem.getMaintenanceStatus();

      res.status(200).json({
        success: true,
        data: status
      });

    } catch (error) {
      console.error('Get maintenance status error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get maintenance status'
      });
    }
  }

  // Get system statistics
  static async getSystemStats(req, res) {
    try {
      const stats = await AdminSystem.getSystemStats();

      res.status(200).json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Get system stats error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get system statistics'
      });
    }
  }

  // Clean up system
  static async cleanupSystem(req, res) {
    try {
      const options = {
        olderThanDays: parseInt(req.body.olderThanDays) || 30,
        includeLogCleanup: req.body.includeLogCleanup !== false,
        includeBackupCleanup: req.body.includeBackupCleanup !== false
      };

      const results = await AdminSystem.cleanupSystem(options);

      res.status(200).json({
        success: true,
        message: 'System cleanup completed',
        data: results
      });

    } catch (error) {
      console.error('Cleanup system error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to cleanup system'
      });
    }
  }

  // Wrapper: getBackupHistory (route expects this name)
  static async getBackupHistory(req, res) {
    return this.listBackups(req, res);
  }

  // Wrapper: getSystemStatus (route expects this name)
  static async getSystemStatus(req, res) {
    return this.getSystemStats(req, res);
  }

  // Wrapper: clearSystemLogs (route expects this name)
  static async clearSystemLogs(req, res) {
    // Use cleanupSystem with includeLogCleanup = true and no other cleanup
    try {
      const options = { olderThanDays: req.body?.olderThanDays || 30, includeLogCleanup: true, includeBackupCleanup: false };
      const results = await AdminSystem.cleanupSystem(options);
      return res.status(200).json({ success: true, message: 'Logs cleared', data: results });
    } catch (error) {
      console.error('clearSystemLogs error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to clear logs' });
    }
  }

  // Wrapper: toggleMaintenanceMode (route expects this name)
  static async toggleMaintenanceMode(req, res) {
    return this.setMaintenanceMode(req, res);
  }

  // Wrapper: healthCheck (route expects this name)
  static async healthCheck(req, res) {
    return this.getSystemHealth(req, res);
  }
}

module.exports = SystemController;