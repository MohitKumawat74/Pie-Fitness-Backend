const mongoose = require('mongoose');

// Define schema for system settings
const settingsSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    enum: ['general', 'email', 'payment', 'security', 'notifications', 'membership', 'appearance']
  },
  key: {
    type: String,
    required: true,
    trim: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed, // Can store any type of value
    required: true
  },
  dataType: {
    type: String,
    enum: ['string', 'number', 'boolean', 'object', 'array'],
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  isEditable: {
    type: Boolean,
    default: true
  },
  isVisible: {
    type: Boolean,
    default: true
  },
  validation: {
    required: {
      type: Boolean,
      default: false
    },
    minLength: {
      type: Number
    },
    maxLength: {
      type: Number
    },
    min: {
      type: Number
    },
    max: {
      type: Number
    },
    pattern: {
      type: String
    },
    options: [{
      label: String,
      value: mongoose.Schema.Types.Mixed
    }]
  }
}, {
  timestamps: true
});

// Compound index for category and key
settingsSchema.index({ category: 1, key: 1 }, { unique: true });

// Static methods for admin operations
settingsSchema.statics.getAllSettings = async function(category = null) {
  try {
    const query = category ? { category } : {};
    return await this.find(query).sort({ category: 1, key: 1 });
  } catch (error) {
    throw new Error('Failed to fetch settings: ' + error.message);
  }
};

settingsSchema.statics.getSettingByKey = async function(category, key) {
  try {
    return await this.findOne({ category, key });
  } catch (error) {
    throw new Error('Failed to fetch setting: ' + error.message);
  }
};

settingsSchema.statics.updateSetting = async function(category, key, value) {
  try {
    const setting = await this.findOne({ category, key });
    
    if (!setting) {
      throw new Error('Setting not found');
    }
    
    if (!setting.isEditable) {
      throw new Error('This setting is not editable');
    }
    
    // Validate the new value based on dataType and validation rules
    const validatedValue = this.validateValue(value, setting);
    
    setting.value = validatedValue;
    await setting.save();
    
    return setting;
  } catch (error) {
    throw new Error('Failed to update setting: ' + error.message);
  }
};

settingsSchema.statics.createSetting = async function(settingData) {
  try {
    const newSetting = new this(settingData);
    return await newSetting.save();
  } catch (error) {
    throw new Error('Failed to create setting: ' + error.message);
  }
};

settingsSchema.statics.deleteSetting = async function(category, key) {
  try {
    const setting = await this.findOne({ category, key });
    
    if (!setting) {
      throw new Error('Setting not found');
    }
    
    if (!setting.isEditable) {
      throw new Error('This setting cannot be deleted');
    }
    
    return await this.findOneAndDelete({ category, key });
  } catch (error) {
    throw new Error('Failed to delete setting: ' + error.message);
  }
};

settingsSchema.statics.validateValue = function(value, setting) {
  const { dataType, validation } = setting;
  
  // Check required
  if (validation.required && (value === null || value === undefined || value === '')) {
    throw new Error('This setting is required');
  }
  
  // Type validation
  switch (dataType) {
    case 'string':
      if (typeof value !== 'string') {
        throw new Error('Value must be a string');
      }
      if (validation.minLength && value.length < validation.minLength) {
        throw new Error(`Value must be at least ${validation.minLength} characters`);
      }
      if (validation.maxLength && value.length > validation.maxLength) {
        throw new Error(`Value must not exceed ${validation.maxLength} characters`);
      }
      if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
        throw new Error('Value does not match required pattern');
      }
      break;
      
    case 'number':
      const numValue = Number(value);
      if (isNaN(numValue)) {
        throw new Error('Value must be a number');
      }
      if (validation.min !== undefined && numValue < validation.min) {
        throw new Error(`Value must be at least ${validation.min}`);
      }
      if (validation.max !== undefined && numValue > validation.max) {
        throw new Error(`Value must not exceed ${validation.max}`);
      }
      return numValue;
      
    case 'boolean':
      if (typeof value === 'string') {
        return value.toLowerCase() === 'true';
      }
      return Boolean(value);
      
    case 'object':
      if (typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('Value must be an object');
      }
      break;
      
    case 'array':
      if (!Array.isArray(value)) {
        throw new Error('Value must be an array');
      }
      break;
  }
  
  return value;
};

settingsSchema.statics.getSettingsByCategory = async function() {
  try {
    const settings = await this.find().sort({ category: 1, key: 1 });
    
    const categorized = {};
    settings.forEach(setting => {
      if (!categorized[setting.category]) {
        categorized[setting.category] = [];
      }
      categorized[setting.category].push(setting);
    });
    
    return categorized;
  } catch (error) {
    throw new Error('Failed to fetch categorized settings: ' + error.message);
  }
};

settingsSchema.statics.initializeDefaultSettings = async function() {
  try {
    const defaultSettings = [
      // General Settings
      {
        category: 'general',
        key: 'gym_name',
        value: 'Zenith Fitness Center',
        dataType: 'string',
        description: 'Name of the gym/fitness center',
        validation: { required: true, minLength: 2, maxLength: 100 }
      },
      {
        category: 'general',
        key: 'gym_address',
        value: '123 Fitness Street, Health City',
        dataType: 'string',
        description: 'Physical address of the gym',
        validation: { required: true }
      },
      {
        category: 'general',
        key: 'contact_phone',
        value: '+91 9876543210',
        dataType: 'string',
        description: 'Primary contact phone number',
        validation: { required: true }
      },
      {
        category: 'general',
        key: 'contact_email',
        value: 'info@zenithfitness.com',
        dataType: 'string',
        description: 'Primary contact email address',
        validation: { required: true }
      },
      
      // Membership Settings
      {
        category: 'membership',
        key: 'trial_period_days',
        value: 7,
        dataType: 'number',
        description: 'Number of days for free trial',
        validation: { min: 0, max: 30 }
      },
      {
        category: 'membership',
        key: 'membership_freeze_allowed',
        value: true,
        dataType: 'boolean',
        description: 'Allow members to freeze their membership'
      },
      
      // Security Settings
      {
        category: 'security',
        key: 'session_timeout_minutes',
        value: 60,
        dataType: 'number',
        description: 'Admin session timeout in minutes',
        validation: { min: 15, max: 480 }
      },
      {
        category: 'security',
        key: 'max_login_attempts',
        value: 5,
        dataType: 'number',
        description: 'Maximum failed login attempts before lockout',
        validation: { min: 3, max: 10 }
      },
      
      // Notification Settings
      {
        category: 'notifications',
        key: 'email_notifications_enabled',
        value: true,
        dataType: 'boolean',
        description: 'Enable email notifications'
      },
      {
        category: 'notifications',
        key: 'sms_notifications_enabled',
        value: false,
        dataType: 'boolean',
        description: 'Enable SMS notifications'
      }
    ];
    
    // Insert only if they don't exist
    for (const setting of defaultSettings) {
      await this.findOneAndUpdate(
        { category: setting.category, key: setting.key },
        setting,
        { upsert: true, new: true }
      );
    }
    
    return true;
  } catch (error) {
    throw new Error('Failed to initialize default settings: ' + error.message);
  }
};

const AdminSettings = mongoose.model('AdminSettings', settingsSchema);

module.exports = AdminSettings;