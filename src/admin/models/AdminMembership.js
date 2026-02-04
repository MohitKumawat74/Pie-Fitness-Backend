const mongoose = require('mongoose');

// Define schema for membership plans
const membershipSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Membership plan name is required'],
    unique: true,
    trim: true
  },
  displayName: {
    type: String,
    required: [true, 'Display name is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Membership description is required'],
    trim: true
  },
  price: {
    monthly: {
      type: Number,
      required: [true, 'Monthly price is required'],
      min: [0, 'Price cannot be negative']
    },
    quarterly: {
      type: Number,
      min: [0, 'Price cannot be negative']
    },
    halfYearly: {
      type: Number,
      min: [0, 'Price cannot be negative']
    },
    yearly: {
      type: Number,
      min: [0, 'Price cannot be negative']
    }
  },
  features: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    included: {
      type: Boolean,
      default: true
    },
    description: {
      type: String,
      trim: true
    }
  }],
  limits: {
    classesPerMonth: {
      type: Number,
      default: -1 // -1 means unlimited
    },
    personalTrainingHours: {
      type: Number,
      default: 0
    },
    guestPasses: {
      type: Number,
      default: 0
    }
  },
  benefits: [{
    type: String,
    trim: true
  }],
  restrictions: [{
    type: String,
    trim: true
  }],
  priority: {
    type: Number,
    default: 1, // Higher number = higher priority in display
    min: 1
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  color: {
    primary: {
      type: String,
      default: '#007bff'
    },
    secondary: {
      type: String,
      default: '#6c757d'
    }
  },
  validityPeriod: {
    months: {
      type: Number,
      default: 1,
      min: 1
    }
  },
  targetAudience: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced', 'All'],
    default: 'All'
  },
  memberCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Virtual for formatted monthly price
membershipSchema.virtual('formattedMonthlyPrice').get(function() {
  return `₹${this.price.monthly.toLocaleString('en-IN')}`;
});

// Virtual for best value calculation
membershipSchema.virtual('bestValue').get(function() {
  const prices = this.price;
  const monthly = prices.monthly;
  const yearly = prices.yearly;
  
  if (yearly && monthly) {
    const yearlyMonthly = yearly / 12;
    const savings = ((monthly - yearlyMonthly) / monthly) * 100;
    return {
      plan: 'yearly',
      savingsPercent: Math.round(savings),
      savingsAmount: Math.round((monthly * 12) - yearly)
    };
  }
  
  return null;
});

// Static methods for admin operations
membershipSchema.statics.getAllMemberships = async function(filters = {}) {
  try {
    const query = {};
    
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    if (filters.targetAudience) query.targetAudience = filters.targetAudience;
    
    return await this.find(query).sort({ priority: -1, createdAt: -1 });
  } catch (error) {
    throw new Error('Failed to fetch memberships: ' + error.message);
  }
};

membershipSchema.statics.getMembershipById = async function(membershipId) {
  try {
    return await this.findById(membershipId);
  } catch (error) {
    throw new Error('Failed to fetch membership: ' + error.message);
  }
};

membershipSchema.statics.createMembership = async function(membershipData) {
  try {
    const newMembership = new this(membershipData);
    return await newMembership.save();
  } catch (error) {
    throw new Error('Failed to create membership: ' + error.message);
  }
};

membershipSchema.statics.updateMembership = async function(membershipId, updateData) {
  try {
    return await this.findByIdAndUpdate(
      membershipId, 
      updateData, 
      { new: true, runValidators: true }
    );
  } catch (error) {
    throw new Error('Failed to update membership: ' + error.message);
  }
};

membershipSchema.statics.deleteMembership = async function(membershipId) {
  try {
    // Check if any users are using this membership plan
    const RegisterUser = require('../../models/RegisterUser');
    const usersWithPlan = await RegisterUser.countDocuments({ membershipPlan: membershipId });
    
    if (usersWithPlan > 0) {
      throw new Error(`Cannot delete membership plan. ${usersWithPlan} users are currently using this plan.`);
    }
    
    return await this.findByIdAndDelete(membershipId);
  } catch (error) {
    throw new Error('Failed to delete membership: ' + error.message);
  }
};

membershipSchema.statics.getMembershipStats = async function() {
  try {
    const totalMemberships = await this.countDocuments();
    const activeMemberships = await this.countDocuments({ isActive: true });
    const inactiveMemberships = await this.countDocuments({ isActive: false });
    
    // Get membership distribution
    const RegisterUser = require('../../models/RegisterUser');
    const membershipDistribution = await RegisterUser.aggregate([
      { $group: { _id: '$membershipPlan', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Get revenue potential
    const revenueStats = await this.aggregate([
      {
        $project: {
          name: 1,
          monthlyRevenue: { $multiply: ['$price.monthly', '$memberCount'] },
          yearlyRevenue: { $multiply: ['$price.yearly', '$memberCount'] }
        }
      },
      {
        $group: {
          _id: null,
          totalMonthlyRevenue: { $sum: '$monthlyRevenue' },
          totalYearlyRevenue: { $sum: '$yearlyRevenue' }
        }
      }
    ]);
    
    // Get popular memberships
    const popularMemberships = await this.find({ isPopular: true }).select('name memberCount');
    
    return {
      totalMemberships,
      activeMemberships,
      inactiveMemberships,
      membershipDistribution,
      revenueStats: revenueStats[0] || {},
      popularMemberships
    };
  } catch (error) {
    throw new Error('Failed to get membership statistics: ' + error.message);
  }
};

// Update member count when users change membership plans
membershipSchema.statics.updateMemberCount = async function(membershipPlan, increment = true) {
  try {
    const update = increment ? { $inc: { memberCount: 1 } } : { $inc: { memberCount: -1 } };
    await this.findOneAndUpdate({ name: membershipPlan }, update);
  } catch (error) {
    console.error('Error updating member count:', error);
  }
};

const AdminMembership = mongoose.model('AdminMembership', membershipSchema);

module.exports = AdminMembership;