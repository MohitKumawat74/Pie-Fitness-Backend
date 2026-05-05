const mongoose = require('mongoose');

const contactUsMessageSchema = new mongoose.Schema({
    first_name: {
        type: String,
        required: true
    },
    last_name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone:{
        type: String,
        required: true,
        trim: true,
        validate: {
            validator: function(value) {
                const digits = String(value || '').replace(/\D/g, '');
                return digits.length >= 7 && digits.length <= 15;
            },
            message: 'Phone number must contain 7 to 15 digits'
        }
    },
    message: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['new', 'pending', 'in_progress', 'approved', 'rejected', 'resolved', 'closed', 'completed'],
        default: 'new'
    },
    adminNotes: {
        type: String,
        default: ''
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    response: {
        type: String,
        default: null
    },
    respondedAt: {
        type: Date,
        default: null
    },
    respondedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null
    },
    category: {
        type: String,
        enum: ['general', 'membership', 'billing', 'technical', 'complaint'],
        default: 'general'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const ContactUsMessage = mongoose.model('ContactUsMessage', contactUsMessageSchema);

module.exports = ContactUsMessage;