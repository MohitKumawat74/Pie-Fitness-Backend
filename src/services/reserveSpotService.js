const ReserveSpot = require('../models/ReserveSpot');

async function reserveSpot(data) {
    const requiredFields = [
        'first_name',
        'last_name',
        'email',
        'phone'
    ];

    const missing = requiredFields.filter((f) => typeof data[f] === 'undefined' || data[f] === null || (typeof data[f] === 'string' && data[f].trim() === ''));
    if (missing.length) {
        const err = new Error('Missing required fields: ' + missing.join(', '));
        err.statusCode = 400;
        throw err;
    }

    const newReservation = new ReserveSpot(Object.assign({}, data));
    return await newReservation.save();
}
async function getAllReserveSpots() {
    return await ReserveSpot.find();
}

async function updateReserveSpot(id, data) {
    if (!id) {
        const err = new Error('Missing id');
        err.statusCode = 400;
        throw err;
    }
    const updated = await ReserveSpot.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    return updated;
}

async function deleteReserveSpot(id) {
    if (!id) {
        const err = new Error('Missing id');
        err.statusCode = 400;
        throw err;
    }
    const deleted = await ReserveSpot.findByIdAndDelete(id);
    return deleted;
}

module.exports = {
    reserveSpot,
    getAllReserveSpots,
    updateReserveSpot,
    deleteReserveSpot
};
