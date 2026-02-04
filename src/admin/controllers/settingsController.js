const AdminSettings = require('../models/AdminSettings');

class SettingsController {
  // Get all settings
  static async getAllSettings(req, res) {
    try {
      const { category } = req.query;

      const settings = await AdminSettings.getAllSettings(category);

      res.status(200).json({
        success: true,
        data: settings
      });

    } catch (error) {
      console.error('Get all settings error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch settings'
      });
    }
  }

  // Get settings by category
  static async getSettingsByCategory(req, res) {
    try {
      const categorizedSettings = await AdminSettings.getSettingsByCategory();

      res.status(200).json({
        success: true,
        data: categorizedSettings
      });

    } catch (error) {
      console.error('Get settings by category error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch categorized settings'
      });
    }
  }

  // Get setting by key
  static async getSettingByKey(req, res) {
    try {
      const { category, key } = req.params;

      const setting = await AdminSettings.getSettingByKey(category, key);

      if (!setting) {
        return res.status(404).json({
          success: false,
          message: 'Setting not found'
        });
      }

      res.status(200).json({
        success: true,
        data: setting
      });

    } catch (error) {
      console.error('Get setting by key error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch setting'
      });
    }
  }

  // Update setting
  static async updateSetting(req, res) {
    try {
      const { category, key } = req.params;
      const { value } = req.body;

      if (value === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Setting value is required'
        });
      }

      const updatedSetting = await AdminSettings.updateSetting(category, key, value);

      res.status(200).json({
        success: true,
        message: 'Setting updated successfully',
        data: updatedSetting
      });

    } catch (error) {
      console.error('Update setting error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update setting'
      });
    }
  }

  // Create new setting
  static async createSetting(req, res) {
    try {
      const settingData = req.body;

      const newSetting = await AdminSettings.createSetting(settingData);

      res.status(201).json({
        success: true,
        message: 'Setting created successfully',
        data: newSetting
      });

    } catch (error) {
      console.error('Create setting error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create setting'
      });
    }
  }

  // Delete setting
  static async deleteSetting(req, res) {
    try {
      const { category, key } = req.params;

      const deletedSetting = await AdminSettings.deleteSetting(category, key);

      res.status(200).json({
        success: true,
        message: 'Setting deleted successfully'
      });

    } catch (error) {
      console.error('Delete setting error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete setting'
      });
    }
  }

  // Initialize default settings
  static async initializeDefaults(req, res) {
    try {
      await AdminSettings.initializeDefaultSettings();

      res.status(200).json({
        success: true,
        message: 'Default settings initialized successfully'
      });

    } catch (error) {
      console.error('Initialize defaults error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to initialize default settings'
      });
    }
  }

  // Reset settings to defaults (route calls resetSettings)
  static async resetSettings(req, res) {
    try {
      await AdminSettings.initializeDefaultSettings();

      res.status(200).json({
        success: true,
        message: 'Settings reset to default values successfully'
      });

    } catch (error) {
      console.error('Reset settings error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to reset settings to defaults'
      });
    }
  }

  // Bulk update settings
  static async bulkUpdateSettings(req, res) {
    try {
      const { settings } = req.body;

      if (!Array.isArray(settings)) {
        return res.status(400).json({
          success: false,
          message: 'Settings must be an array'
        });
      }

      const results = [];
      
      for (const setting of settings) {
        try {
          const { category, key, value } = setting;
          const updatedSetting = await AdminSettings.updateSetting(category, key, value);
          results.push({
            category,
            key,
            success: true,
            data: updatedSetting
          });
        } catch (error) {
          results.push({
            category: setting.category,
            key: setting.key,
            success: false,
            error: error.message
          });
        }
      }

      res.status(200).json({
        success: true,
        message: 'Bulk settings update completed',
        data: results
      });

    } catch (error) {
      console.error('Bulk update settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to bulk update settings'
      });
    }
  }
}

module.exports = SettingsController;