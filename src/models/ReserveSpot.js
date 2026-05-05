const mongoose = require('mongoose');

const reserveSpotSchema = new mongoose.Schema({
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
            validator: function(value) {
                if (!value) return false;
                const normalized = String(value).replace(/[^\d+]/g, '');
                const digitsOnly = normalized.replace(/\D/g, '');
                return digitsOnly.length >= 7 && digitsOnly.length <= 15;
            },
            message: 'Phone number must contain 7 to 15 digits'
        }
    },
    preferred_class_type: {
        type: String
    },
    preferred_class_date: {
        type: Date
    },
    preferred_class_time: {
        type: String
    },
    duration: {
        type: String
    },
    participants: {
        type: Number
    },
    schedule: {
        type: String
    },
    notes: {
        type: String
    },
    status: {
        type: String,
        enum: ['new', 'in-progress', 'completed', 'cancelled'],
        default: 'new'
    },
    adminNotes: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

const ReserveSpot = mongoose.model('ReserveSpot', reserveSpotSchema);

module.exports = ReserveSpot;
