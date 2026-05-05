const ReserveSpot = require('../models/ReserveSpot');

function normalizePhone(phone) {
    const raw = String(phone || '').trim();
    if (!raw) return '';

    const hasPlus = raw.startsWith('+');
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';

    return hasPlus ? `+${digits}` : digits;
}

function validatePhone(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    return digits.length >= 7 && digits.length <= 15;
}

function normalizeStatus(status) {
    if (status === undefined || status === null || status === '') return undefined;

    const value = String(status).trim().toLowerCase().replace(/\s+/g, '-');
    const map = {
        new: 'new',
        'in-progress': 'in-progress',
        inprogress: 'in-progress',
        completed: 'completed',
        cancelled: 'cancelled',
        canceled: 'cancelled'
    };

    return map[value] || value;
}

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

    const payload = Object.assign({}, data);
    payload.phone = normalizePhone(payload.phone);
    if (payload.status !== undefined) {
        payload.status = normalizeStatus(payload.status);
    }
    if (payload.adminNotes !== undefined) {
        payload.adminNotes = String(payload.adminNotes || '');
    }

    if (!validatePhone(payload.phone)) {
        const err = new Error('Invalid phone number. It must contain 7 to 15 digits.');
        err.statusCode = 400;
        throw err;
    }

    const newReservation = new ReserveSpot(payload);
    return await newReservation.save();
}
async function getAllReserveSpots() {
    return await ReserveSpot.find();
}

async function getReserveSpotById(id) {
    if (!id) {
        const err = new Error('Missing id');
        err.statusCode = 400;
        throw err;
    }

    return await ReserveSpot.findById(id);
}

async function updateReserveSpot(id, data) {
    if (!id) {
        const err = new Error('Missing id');
        err.statusCode = 400;
        throw err;
    }
    const payload = Object.assign({}, data);
    if (Object.prototype.hasOwnProperty.call(payload, 'phone')) {
        payload.phone = normalizePhone(payload.phone);
        if (!validatePhone(payload.phone)) {
            const err = new Error('Invalid phone number. It must contain 7 to 15 digits.');
            err.statusCode = 400;
            throw err;
        }
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'status')) {
        payload.status = normalizeStatus(payload.status);
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'adminNotes')) {
        payload.adminNotes = String(payload.adminNotes || '');
    }

    const updated = await ReserveSpot.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
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
    getReserveSpotById,
    updateReserveSpot,
    deleteReserveSpot
};
