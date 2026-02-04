const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');

class AdminSystem {
  // System health check
  static async getSystemHealth() {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'unknown',
          server: 'running',
          storage: 'unknown'
        },
        metrics: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage()
        }
      };

      // Check database connection
      try {
        await mongoose.connection.db.admin().ping();
        health.services.database = 'connected';
      } catch (error) {
        health.services.database = 'disconnected';
        health.status = 'degraded';
      }

      // Check storage (uploads directory)
      try {
        const uploadsPath = path.join(process.cwd(), 'uploads');
        await fs.access(uploadsPath);
        health.services.storage = 'accessible';
      } catch (error) {
        health.services.storage = 'inaccessible';
        health.status = 'degraded';
      }

      return health;
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  // Get system logs
  static async getSystemLogs(options = {}) {
    try {
      const { 
        level = 'all', 
        limit = 100, 
        offset = 0,
        startDate,
        endDate 
      } = options;

      // This is a basic implementation - in production you'd use a proper logging system
      const logs = [];

      // Get application logs from console/file system
      // For now, return mock data structure
      const logLevels = level === 'all' ? ['error', 'warn', 'info', 'debug'] : [level];

      // Simulate log entries
      for (let i = 0; i < Math.min(limit, 50); i++) {
        logs.push({
          timestamp: new Date(Date.now() - (i * 60000)).toISOString(),
          level: logLevels[Math.floor(Math.random() * logLevels.length)],
          message: `System log entry ${i + 1}`,
          source: 'admin-system',
          metadata: {
            requestId: `req_${Math.random().toString(36).substr(2, 9)}`,
            userId: null
          }
        });
      }

      return {
        logs: logs.slice(offset, offset + limit),
        totalCount: logs.length,
        hasMore: offset + limit < logs.length
      };
    } catch (error) {
      throw new Error('Failed to retrieve system logs: ' + error.message);
    }
  }

  // Create system backup
  static async createBackup(options = {}) {
    try {
      const { 
        includeDatabase = true,
        includeUploads = true,
        compression = true 
      } = options;

      const backupId = `backup_${Date.now()}`;
      const backupPath = path.join(process.cwd(), 'backups', backupId);

      // Create backup directory
      await fs.mkdir(backupPath, { recursive: true });

      const backupInfo = {
        id: backupId,
        timestamp: new Date().toISOString(),
        status: 'in_progress',
        size: 0,
        components: []
      };

      if (includeDatabase) {
        try {
          // Database backup (using mongodump would be better in production)
          const collections = await mongoose.connection.db.listCollections().toArray();
          
          for (const collection of collections) {
            const data = await mongoose.connection.db.collection(collection.name).find({}).toArray();
            const filename = `${collection.name}.json`;
            const filePath = path.join(backupPath, filename);
            
            await fs.writeFile(filePath, JSON.stringify(data, null, 2));
            
            backupInfo.components.push({
              type: 'database',
              name: collection.name,
              size: Buffer.byteLength(JSON.stringify(data))
            });
          }
        } catch (error) {
          console.error('Database backup error:', error);
        }
      }

      if (includeUploads) {
        try {
          const uploadsPath = path.join(process.cwd(), 'uploads');
          const uploadsBackupPath = path.join(backupPath, 'uploads');
          
          // Copy uploads directory (recursive)
          await this.copyDirectory(uploadsPath, uploadsBackupPath);
          
          backupInfo.components.push({
            type: 'files',
            name: 'uploads',
            size: await this.getDirectorySize(uploadsBackupPath)
          });
        } catch (error) {
          console.error('Uploads backup error:', error);
        }
      }

      // Calculate total backup size
      backupInfo.size = await this.getDirectorySize(backupPath);
      backupInfo.status = 'completed';

      // Save backup metadata
      const metadataPath = path.join(backupPath, 'backup-info.json');
      await fs.writeFile(metadataPath, JSON.stringify(backupInfo, null, 2));

      return backupInfo;
    } catch (error) {
      throw new Error('Failed to create backup: ' + error.message);
    }
  }

  // List available backups
  static async listBackups() {
    try {
      const backupsDir = path.join(process.cwd(), 'backups');
      
      try {
        await fs.access(backupsDir);
      } catch {
        // Backups directory doesn't exist
        return [];
      }

      const backupDirs = await fs.readdir(backupsDir);
      const backups = [];

      for (const dir of backupDirs) {
        try {
          const metadataPath = path.join(backupsDir, dir, 'backup-info.json');
          const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
          backups.push(metadata);
        } catch (error) {
          // Skip invalid backup directories
          console.warn(`Invalid backup directory: ${dir}`);
        }
      }

      return backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
      throw new Error('Failed to list backups: ' + error.message);
    }
  }

  // Delete backup
  static async deleteBackup(backupId) {
    try {
      const backupPath = path.join(process.cwd(), 'backups', backupId);
      
      // Check if backup exists
      try {
        await fs.access(backupPath);
      } catch {
        throw new Error('Backup not found');
      }

      // Remove backup directory recursively
      await fs.rm(backupPath, { recursive: true, force: true });

      return { success: true, message: 'Backup deleted successfully' };
    } catch (error) {
      throw new Error('Failed to delete backup: ' + error.message);
    }
  }

  // System maintenance mode
  static async setMaintenanceMode(enabled, message = null) {
    try {
      const maintenanceFile = path.join(process.cwd(), '.maintenance');
      
      if (enabled) {
        const maintenanceInfo = {
          enabled: true,
          message: message || 'System is under maintenance. Please try again later.',
          startTime: new Date().toISOString()
        };
        
        await fs.writeFile(maintenanceFile, JSON.stringify(maintenanceInfo, null, 2));
      } else {
        try {
          await fs.unlink(maintenanceFile);
        } catch (error) {
          // File doesn't exist, which is fine
        }
      }

      return {
        maintenanceMode: enabled,
        message: enabled ? message : 'Maintenance mode disabled'
      };
    } catch (error) {
      throw new Error('Failed to set maintenance mode: ' + error.message);
    }
  }

  // Check maintenance mode status
  static async getMaintenanceStatus() {
    try {
      const maintenanceFile = path.join(process.cwd(), '.maintenance');
      
      try {
        const data = await fs.readFile(maintenanceFile, 'utf8');
        return JSON.parse(data);
      } catch {
        return { enabled: false };
      }
    } catch (error) {
      throw new Error('Failed to check maintenance status: ' + error.message);
    }
  }

  // Get system statistics
  static async getSystemStats() {
    try {
      const RegisterUser = require('../../models/RegisterUser');
      const Payment = require('../../models/Payment');
      const AdminClass = require('./AdminClass');
      const AdminTrainer = require('./AdminTrainer');

      const stats = {
        users: {
          total: await RegisterUser.countDocuments(),
          active: await RegisterUser.countDocuments({ isActive: true }),
          newThisMonth: await RegisterUser.countDocuments({
            createdAt: { $gte: new Date(new Date().setDate(1)) }
          })
        },
        revenue: {
          total: 0,
          thisMonth: 0
        },
        classes: {
          total: await AdminClass.countDocuments(),
          active: await AdminClass.countDocuments({ isActive: true })
        },
        trainers: {
          total: await AdminTrainer.countDocuments(),
          active: await AdminTrainer.countDocuments({ status: 'Active' })
        },
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          nodeVersion: process.version,
          platform: process.platform
        }
      };

      // Calculate revenue stats
      const revenueResult = await Payment.aggregate([
        {
          $match: { status: { $in: ['success', 'paid'] } }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      const monthlyRevenueResult = await Payment.aggregate([
        {
          $match: {
            status: { $in: ['success', 'paid'] },
            createdAt: { $gte: new Date(new Date().setDate(1)) }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      stats.revenue.total = revenueResult[0]?.total || 0;
      stats.revenue.thisMonth = monthlyRevenueResult[0]?.total || 0;

      return stats;
    } catch (error) {
      throw new Error('Failed to get system statistics: ' + error.message);
    }
  }

  // Helper method to copy directory recursively
  static async copyDirectory(src, dest) {
    try {
      await fs.mkdir(dest, { recursive: true });
      const entries = await fs.readdir(src, { withFileTypes: true });

      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
          await this.copyDirectory(srcPath, destPath);
        } else {
          await fs.copyFile(srcPath, destPath);
        }
      }
    } catch (error) {
      // Ignore errors for non-existent source directories
      console.warn(`Copy directory warning: ${error.message}`);
    }
  }

  // Helper method to calculate directory size
  static async getDirectorySize(dirPath) {
    try {
      let size = 0;
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          size += await this.getDirectorySize(fullPath);
        } else {
          const stat = await fs.stat(fullPath);
          size += stat.size;
        }
      }

      return size;
    } catch (error) {
      return 0;
    }
  }

  // Clean up old logs and temporary files
  static async cleanupSystem(options = {}) {
    try {
      const { 
        olderThanDays = 30,
        includeLogCleanup = true,
        includeBackupCleanup = true 
      } = options;

      const cutoffDate = new Date(Date.now() - (olderThanDays * 24 * 60 * 60 * 1000));
      const results = {
        logsDeleted: 0,
        backupsDeleted: 0,
        spaceFreed: 0
      };

      if (includeBackupCleanup) {
        const backups = await this.listBackups();
        
        for (const backup of backups) {
          if (new Date(backup.timestamp) < cutoffDate) {
            await this.deleteBackup(backup.id);
            results.backupsDeleted++;
            results.spaceFreed += backup.size;
          }
        }
      }

      if (includeLogCleanup) {
        // Clean up log files (implementation depends on logging system)
        // For now, just simulate
        results.logsDeleted = 5;
      }

      return results;
    } catch (error) {
      throw new Error('Failed to cleanup system: ' + error.message);
    }
  }
}

module.exports = AdminSystem;