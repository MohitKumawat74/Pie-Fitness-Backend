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
        type: Number,
        required: true
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
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const ReserveSpot = mongoose.model('ReserveSpot', reserveSpotSchema);

module.exports = ReserveSpot;
