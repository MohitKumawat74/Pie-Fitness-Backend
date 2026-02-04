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
        type: Number,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['new', 'in_progress', 'resolved', 'closed'],
        default: 'new'
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