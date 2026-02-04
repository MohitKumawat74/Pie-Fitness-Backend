const express = require('express');
const router = express.Router();
const { logAdminActivity } = require('../middleware/adminMiddleware');
const SystemController = require('../controllers/systemController');

// System backup
router.post('/backup',
  logAdminActivity('create', 'system_backup'),
  SystemController.createBackup
);

// Get backup history
router.get('/backups',
  logAdminActivity('view', 'backup_history'),
  SystemController.getBackupHistory
);

// Get system status
router.get('/status',
  logAdminActivity('view', 'system_status'),
  SystemController.getSystemStatus
);

// Get system logs
router.get('/logs',
  logAdminActivity('view', 'system_logs'),
  SystemController.getSystemLogs
);

// Clear system logs
router.delete('/logs',
  logAdminActivity('clear', 'system_logs'),
  SystemController.clearSystemLogs
);

// System maintenance mode
router.post('/maintenance',
  logAdminActivity('toggle', 'maintenance_mode'),
  SystemController.toggleMaintenanceMode
);

// Health check endpoint
router.get('/health',
  SystemController.healthCheck
);

module.exports = router;