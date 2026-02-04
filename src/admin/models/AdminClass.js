const mongoose = require('mongoose');

// Define schema for gym classes
const classSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Class name is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Class description is required'],
    trim: true
  },
  instructor: {
    type: String,
    required: [true, 'Instructor name is required'],
    trim: true
  },
  instructorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trainer',
    default: null
  },
  duration: {
    type: Number, // Duration in minutes
    required: [true, 'Class duration is required'],
    min: [15, 'Class duration must be at least 15 minutes'],
    max: [240, 'Class duration cannot exceed 4 hours']
  },
  capacity: {
    type: Number,
    required: [true, 'Class capacity is required'],
    min: [1, 'Class capacity must be at least 1'],
    max: [100, 'Class capacity cannot exceed 100']
  },
  currentEnrollment: {
    type: Number,
    default: 0,
    min: 0
  },
  schedule: [{
    dayOfWeek: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: true
    },
    startTime: {
      type: String, // Format: "HH:MM" (24-hour format)
      required: true,
      validate: {
        validator: function(v) {
          return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
        },
        message: 'Start time must be in HH:MM format (24-hour)'
      }
    },
    endTime: {
      type: String, // Format: "HH:MM" (24-hour format)
      required: true,
      validate: {
        validator: function(v) {
          return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
        },
        message: 'End time must be in HH:MM format (24-hour)'
      }
    }
  }],
  category: {
    type: String,
    enum: ['Cardio', 'Strength', 'Yoga', 'Pilates', 'HIIT', 'Dance', 'Martial Arts', 'Swimming', 'Other'],
    required: true
  },
  difficulty: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    required: true
  },
  equipment: [{
    type: String,
    trim: true
  }],
  price: {
    type: Number,
    required: [true, 'Class price is required'],
    min: [0, 'Class price cannot be negative']
  },
  membershipRequired: {
    type: [String],
    enum: ['monthly', 'quarterly', 'halfYearly', 'annually'],
    default: ['monthly', 'quarterly', 'halfYearly', 'annually']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  location: {
    room: {
      type: String,
      trim: true
    },
    floor: {
      type: String,
      trim: true
    }
  },
  specialRequirements: {
    type: String,
    trim: true
  },
  enrolledMembers: [{
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RegisterUser'
    },
    enrolledAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Virtual for availability
classSchema.virtual('availability').get(function() {
  return this.capacity - this.currentEnrollment;
});

// Virtual for is full
classSchema.virtual('isFull').get(function() {
  return this.currentEnrollment >= this.capacity;
});

// Static methods for admin operations
classSchema.statics.getAllClasses = async function(filters = {}) {
  try {
    const query = {};
    
    if (filters.category) query.category = filters.category;
    if (filters.difficulty) query.difficulty = filters.difficulty;
    if (filters.instructor) query.instructor = new RegExp(filters.instructor, 'i');
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    
    return await this.find(query)
      .populate('instructorId', 'fullName email')
      .populate('enrolledMembers.memberId', 'fullName email')
      .sort({ createdAt: -1 });
  } catch (error) {
    throw new Error('Failed to fetch classes: ' + error.message);
  }
};

classSchema.statics.getClassById = async function(classId) {
  try {
    return await this.findById(classId)
      .populate('instructorId', 'fullName email phone')
      .populate('enrolledMembers.memberId', 'fullName email phone membershipPlan');
  } catch (error) {
    throw new Error('Failed to fetch class: ' + error.message);
  }
};

classSchema.statics.createClass = async function(classData) {
  try {
    const newClass = new this(classData);
    return await newClass.save();
  } catch (error) {
    throw new Error('Failed to create class: ' + error.message);
  }
};

classSchema.statics.updateClass = async function(classId, updateData) {
  try {
    return await this.findByIdAndUpdate(
      classId, 
      updateData, 
      { new: true, runValidators: true }
    );
  } catch (error) {
    throw new Error('Failed to update class: ' + error.message);
  }
};

classSchema.statics.deleteClass = async function(classId) {
  try {
    return await this.findByIdAndDelete(classId);
  } catch (error) {
    throw new Error('Failed to delete class: ' + error.message);
  }
};

classSchema.statics.getClassStats = async function() {
  try {
    const totalClasses = await this.countDocuments();
    const activeClasses = await this.countDocuments({ isActive: true });
    const inactiveClasses = await this.countDocuments({ isActive: false });
    
    // Get classes by category
    const classByCategory = await this.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Get classes by difficulty
    const classByDifficulty = await this.aggregate([
      { $group: { _id: '$difficulty', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Calculate average capacity and enrollment
    const capacityStats = await this.aggregate([
      {
        $group: {
          _id: null,
          totalCapacity: { $sum: '$capacity' },
          totalEnrollment: { $sum: '$currentEnrollment' },
          avgCapacity: { $avg: '$capacity' },
          avgEnrollment: { $avg: '$currentEnrollment' }
        }
      }
    ]);
    
    return {
      totalClasses,
      activeClasses,
      inactiveClasses,
      classByCategory,
      classByDifficulty,
      capacityStats: capacityStats[0] || {}
    };
  } catch (error) {
    throw new Error('Failed to get class statistics: ' + error.message);
  }
};

const AdminClass = mongoose.model('AdminClass', classSchema);

module.exports = AdminClass;