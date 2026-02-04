const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true
    },
    razorpayOrderId: {
        type: String,
        required: false  // Not required for UPI payments
    },
    razorpayPaymentId: {
        type: String
    },
    razorpaySignature: {
        type: String
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'INR'
    },
    status: {
        type: String,
        enum: ['created', 'paid', 'failed', 'cancelled', 'success', 'pending', 'processing', 'refunded', 'verification_pending'],
        default: 'created'
    },
    customerEmail: {
        type: String
    },
    customerPhone: {
        type: String
    },
    customerName: {
        type: String
    },
    description: {
        type: String
    },
    notes: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RegisterUser'
    },
    subscriptionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subscription'
    },
    paymentMethod: {
        type: String,
        enum: ['razorpay', 'stripe', 'paypal', 'bank_transfer', 'cash', 'upi'],
        default: 'razorpay'
    },
    // UPI Payment specific fields
    upiDetails: {
        transactionId: { type: String },  // UTR or Transaction Reference Number
        upiId: { type: String },  // sender's UPI ID (e.g., user@paytm)
        appUsed: { type: String },  // PhonePe, GooglePay, Paytm, etc.
        screenshot: { type: String },  // path to payment screenshot
        transactionDate: { type: Date },  // when payment was made
        verified: { type: Boolean, default: false },  // admin verification status
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminAuth' },
        verifiedAt: { type: Date },
        remarks: { type: String }  // admin remarks during verification
    },
    refund: {
        amount: { type: Number },
        reason: { type: String },
        processedAt: { type: Date },
        processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
        refundId: { type: String }
    },
    failureReason: {
        type: String
    },
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
paymentSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;