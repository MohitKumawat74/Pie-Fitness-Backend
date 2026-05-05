const mongoose = require('mongoose');

const bookFreeTrialSchema = new mongoose.Schema({
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
    phone: {
        type: String,
        required: true,
        trim: true,
        validate: {
            validator: function(v) {
                return typeof v === 'string' && v.length > 0;
            },
            message: 'Phone number is required'
        }
    },
    preferred_class_type: {
        type: String,
        required: true
    },
    preferred_class_date: {
        type: Date,
        required: true
    },
    preferred_class_time: {
        type: String,
        required: true
    },
    notes: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const BookFreeTrial = mongoose.model('BookFreeTrial', bookFreeTrialSchema);

module.exports = BookFreeTrial;