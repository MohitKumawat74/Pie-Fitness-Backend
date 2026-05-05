const mongoose = require('mongoose');

const normalizeStatus = (status) => {
  if (!status) return status;

  const normalized = String(status).trim().toLowerCase();
  const statusMap = {
    active: 'Active',
    inactive: 'Inactive',
    'on leave': 'On Leave',
    terminated: 'Terminated'
  };

  return statusMap[normalized] || status;
};

const generateEmployeeId = (fullName) => {
  const namePart = String(fullName || 'TRN')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 3)
    .toUpperCase() || 'TRN';

  const timestampPart = Date.now().toString().slice(-6);
  const randomPart = Math.floor(Math.random() * 900 + 100).toString();

  return `${namePart}${timestampPart}${randomPart}`;
};

// Define schema for gym trainers
const trainerSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Trainer full name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^\S+@\S+\.\S+$/.test(v);
      },
      message: 'Please enter a valid email address'
    }
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    validate: {
      validator: function(v) {
        return /^(?:\+91|0)?[6-9]\d{9}$/.test(v);
      },
      message: 'Please enter a valid phone number'
    }
  },
  employeeId: {
    type: String,
    unique: true,
    default: function() {
      return generateEmployeeId(this.fullName);
    },
    trim: true
  },
  dateOfBirth: {
    type: Date,
    default: null
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    default: null
  },
  address: {
    street: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    pincode: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      default: 'India',
      trim: true
    }
  },
  profileImage: {
    type: String,
    default: null
  },
  specializations: [{
    type: String,
    trim: true
  }],
  specialties: [{
    type: String,
    trim: true
  }],
  certifications: [{
    name: {
      type: String,
      trim: true
    },
    issuedBy: {
      type: String,
      trim: true
    },
    issuedDate: {
      type: Date,
      default: null
    },
    expiryDate: {
      type: Date
    },
    certificateNumber: {
      type: String,
      trim: true
    }
  }],
  experience: {
    type: Number, // Years of experience
    required: [true, 'Experience is required'],
    min: [0, 'Experience cannot be negative']
  },
  hourlyRate: {
    type: Number,
    default: 0,
    min: [0, 'Hourly rate cannot be negative']
  },
  bio: {
    type: String,
    trim: true,
    default: ''
  },
  certification: {
    type: String,
    trim: true,
    default: ''
  },
  totalClasses: {
    type: Number,
    default: 0,
    min: 0
  },
  salary: {
    amount: {
      type: Number,
      default: 0,
      min: [0, 'Salary cannot be negative']
    },
    currency: {
      type: String,
      default: 'INR'
    },
    frequency: {
      type: String,
      enum: ['Monthly', 'Annual'],
      default: 'Monthly'
    }
  },
  schedule: [{
    dayOfWeek: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: true
    },
    startTime: {
      type: String, // Format: "HH:MM"
      required: true,
      validate: {
        validator: function(v) {
          return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
        },
        message: 'Start time must be in HH:MM format (24-hour)'
      }
    },
    endTime: {
      type: String, // Format: "HH:MM"
      required: true,
      validate: {
        validator: function(v) {
          return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
        },
        message: 'End time must be in HH:MM format (24-hour)'
      }
    }
  }],
  assignedClasses: [{
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminClass'
    },
    className: {
      type: String,
      trim: true
    },
    assignedAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'On Leave', 'Terminated'],
    default: 'Active',
    set: normalizeStatus
  },
  joinDate: {
    type: Date,
    default: Date.now
  },
  terminationDate: {
    type: Date,
    default: null
  },
  emergencyContact: {
    name: {
      type: String,
      trim: true
    },
    relationship: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    }
  },
  notes: {
    type: String,
    trim: true
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalReviews: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Virtual for age
trainerSchema.virtual('age').get(function() {
  if (this.dateOfBirth) {
    const today = new Date();
    const birth = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }
  return null;
});

trainerSchema.statics.normalizeTrainerData = function(trainerData = {}, options = {}) {
  const normalizedData = { ...trainerData };
  const { preserveEmployeeId = false } = options;

  if (Array.isArray(normalizedData.specialties) && !normalizedData.specializations) {
    normalizedData.specializations = normalizedData.specialties;
  }

  if (normalizedData.bio && !normalizedData.notes) {
    normalizedData.notes = normalizedData.bio;
  }

  if (normalizedData.hourlyRate != null) {
    const rate = Number(normalizedData.hourlyRate);
    if (!Number.isNaN(rate)) {
      normalizedData.hourlyRate = rate;
      normalizedData.salary = {
        ...(normalizedData.salary || {}),
        amount: normalizedData.salary && normalizedData.salary.amount != null
          ? Number(normalizedData.salary.amount)
          : rate
      };
    }
  }

  if (normalizedData.status) {
    normalizedData.status = normalizeStatus(normalizedData.status);
  }

  if (!preserveEmployeeId && !normalizedData.employeeId) {
    normalizedData.employeeId = generateEmployeeId(normalizedData.fullName);
  }

  if (normalizedData.dateOfBirth === '') {
    normalizedData.dateOfBirth = null;
  }

  return normalizedData;
};

// Static methods for admin operations
trainerSchema.statics.getAllTrainers = async function(filters = {}) {
  try {
    const query = {};
    
    if (filters.status) query.status = filters.status;
    if (filters.specialization) query.specializations = { $in: [filters.specialization] };
    if (filters.search) {
      query.$or = [
        { fullName: new RegExp(filters.search, 'i') },
        { email: new RegExp(filters.search, 'i') },
        { employeeId: new RegExp(filters.search, 'i') }
      ];
    }
    
    return await this.find(query)
      .populate('assignedClasses.classId', 'name schedule')
      .sort({ createdAt: -1 });
  } catch (error) {
    throw new Error('Failed to fetch trainers: ' + error.message);
  }
};

trainerSchema.statics.getTrainerById = async function(trainerId) {
  try {
    return await this.findById(trainerId)
      .populate('assignedClasses.classId', 'name description schedule capacity currentEnrollment');
  } catch (error) {
    throw new Error('Failed to fetch trainer: ' + error.message);
  }
};

trainerSchema.statics.createTrainer = async function(trainerData) {
  try {
    const normalizedData = this.normalizeTrainerData(trainerData);
    const newTrainer = new this(normalizedData);
    return await newTrainer.save();
  } catch (error) {
    throw new Error('Failed to create trainer: ' + error.message);
  }
};

trainerSchema.statics.updateTrainer = async function(trainerId, updateData) {
  try {
    return await this.findByIdAndUpdate(
      trainerId, 
      updateData, 
      { new: true, runValidators: true }
    );
  } catch (error) {
    throw new Error('Failed to update trainer: ' + error.message);
  }
};

trainerSchema.statics.deleteTrainer = async function(trainerId) {
  try {
    return await this.findByIdAndDelete(trainerId);
  } catch (error) {
    throw new Error('Failed to delete trainer: ' + error.message);
  }
};

trainerSchema.statics.getTrainerStats = async function() {
  try {
    const totalTrainers = await this.countDocuments();
    const activeTrainers = await this.countDocuments({ status: 'Active' });
    const inactiveTrainers = await this.countDocuments({ status: 'Inactive' });
    const onLeaveTrainers = await this.countDocuments({ status: 'On Leave' });
    
    // Get trainers by specialization
    const trainersBySpecialization = await this.aggregate([
      { $unwind: '$specializations' },
      { $group: { _id: '$specializations', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Get average experience
    const experienceStats = await this.aggregate([
      {
        $group: {
          _id: null,
          avgExperience: { $avg: '$experience' },
          maxExperience: { $max: '$experience' },
          minExperience: { $min: '$experience' }
        }
      }
    ]);
    
    // Get average rating
    const ratingStats = await this.aggregate([
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating.average' },
          totalReviews: { $sum: '$rating.totalReviews' }
        }
      }
    ]);
    
    return {
      totalTrainers,
      activeTrainers,
      inactiveTrainers,
      onLeaveTrainers,
      trainersBySpecialization,
      experienceStats: experienceStats[0] || {},
      ratingStats: ratingStats[0] || {}
    };
  } catch (error) {
    throw new Error('Failed to get trainer statistics: ' + error.message);
  }
};

const AdminTrainer = mongoose.model('AdminTrainer', trainerSchema);

module.exports = AdminTrainer;