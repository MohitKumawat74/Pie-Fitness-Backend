const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    // User Information
    memberId: {
        type: String,
        required: true
    },
    memberName: {
        type: String,
        required: true
    },
    memberEmail: {
        type: String,
        required: true
    },
    
    // Subscription Details
    planName: {
        type: String,
        required: true
    },
    planType: {
        type: String,
        enum: ['monthly', 'quarterly', 'halfYearly', 'yearly'],
        default: 'monthly'
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    nextBillingDate: {
        type: Date
    },
    
    // Payment Information
    amount: {
        type: Number,
        required: true
    },
    price: {
        type: Number,
        required: false,
        default: 0
    },
    paymentMethod: {
        type: String,
        enum: ['Credit Card', 'Debit Card', 'UPI', 'Bank Transfer', 'Cash'],
        default: 'Cash'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'overdue'],
        default: 'pending'
    },
    lastPaymentDate: {
        type: Date
    },
    
    // Subscription Status
    status: {
        type: String,
        enum: ['active', 'inactive', 'paused', 'cancelled'],
        default: 'active'
    },
    autoRenewal: {
        type: Boolean,
        default: false
    },
    
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt field before saving
subscriptionSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Subscription', subscriptionSchema);
    
