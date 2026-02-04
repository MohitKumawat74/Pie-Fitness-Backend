const express = require('express');
const router = express.Router();
const { logAdminActivity } = require('../middleware/adminMiddleware');
const SettingsController = require('../controllers/settingsController');

// Get all settings
router.get('/',
  logAdminActivity('view', 'settings'),
  SettingsController.getAllSettings
);

// Get settings by category
router.get('/category/:category',
  logAdminActivity('view', 'settings_category'),
  SettingsController.getSettingsByCategory
);

// Get specific setting
router.get('/:key',
  logAdminActivity('view', 'setting_detail'),
  SettingsController.getSettingByKey
);

// Update setting
router.put('/:key',
  logAdminActivity('update', 'setting'),
  SettingsController.updateSetting
);

// Create setting
router.post('/',
  logAdminActivity('create', 'setting'),
  SettingsController.createSetting
);

// Delete setting
router.delete('/:key',
  logAdminActivity('delete', 'setting'),
  SettingsController.deleteSetting
);

// Bulk update settings
router.post('/bulk-update',
  logAdminActivity('bulk_update', 'settings'),
  SettingsController.bulkUpdateSettings
);

// Reset settings to default
router.post('/reset',
  logAdminActivity('reset', 'settings'),
  SettingsController.resetSettings
);

module.exports = router;