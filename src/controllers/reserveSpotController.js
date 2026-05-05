const ReserveSpot = require('../models/ReserveSpot');
const reserveSpotService = require('../services/reserveSpotService');
const { createAdminNotification } = require('../services/notificationService');

function formatReserveSpot(doc) {
    const spot = typeof doc?.toObject === 'function' ? doc.toObject() : doc;
    if (!spot) return spot;

    return {
        id: spot._id ? spot._id.toString() : undefined,
        first_name: spot.first_name,
        last_name: spot.last_name,
        email: spot.email,
        phone: spot.phone,
        status: spot.status,
        adminNotes: spot.adminNotes,
        duration: spot.duration,
        participants: spot.participants,
        schedule: spot.schedule,
        notes: spot.notes,
        createdAt: spot.createdAt
    };
}

//get all reserve spot submissions
exports.getAllReserveSpots = async (req, res) => {
    try {
        const reserveSpots = await reserveSpotService.getAllReserveSpots();
        return sendSuccess(res, 200, 'Reserve spots fetched successfully', reserveSpots.map(formatReserveSpot));
    } catch (error) {
        console.error('getAllReserveSpots error:', error);
        return sendError(res, 500, 'Error fetching reserve spots', error);
    }
};

// get a reserve spot submission by id
exports.getReserveSpotById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return sendError(res, 400, 'Missing reservation id');

        const reserveSpot = await reserveSpotService.getReserveSpotById(id);
        if (!reserveSpot) {
            return sendError(res, 404, 'Reserve spot not found');
        }

        return sendSuccess(res, 200, 'Reserve spot fetched successfully', formatReserveSpot(reserveSpot));
    } catch (error) {
        console.error('getReserveSpotById error:', error);
        const status = error.statusCode || (error.name === 'CastError' ? 400 : 500);
        return sendError(res, status, 'Error fetching reserve spot', error);
    }
};
//reserve a spot
exports.reserveSpot = async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return sendError(res, 400, 'Request body is required');
        }

        const newReservation = await reserveSpotService.reserveSpot(req.body);
        await createAdminNotification({
            title: 'New reserve spot request',
            message: `${newReservation.first_name} ${newReservation.last_name} submitted a reserve spot request`,
            type: 'general',
            link: '/admin/reserve-spot',
            metadata: {
                reservationId: newReservation._id.toString(),
                email: newReservation.email,
                phone: newReservation.phone,
                status: newReservation.status
            },
            createdBy: null
        });
        return sendSuccess(res, 201, 'Spot reserved successfully', formatReserveSpot(newReservation));
    } catch (error) {
        console.error('reserveSpot error:', error);
        const status = error.statusCode || (error.name === 'ValidationError' || error.name === 'CastError' ? 400 : 500);
        return sendError(res, status, 'Error reserving spot', error);
    }
};
//update a reserve spot submission by id
exports.updateReserveSpot = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return sendError(res, 400, 'Missing reservation id');

        const updatedReservation = await reserveSpotService.updateReserveSpot(id, req.body);
        return sendSuccess(res, 200, 'Spot updated successfully', formatReserveSpot(updatedReservation));
    } catch (error) {
        console.error('updateReserveSpot error:', error);
        const status = error.statusCode || (error.name === 'ValidationError' || error.name === 'CastError' ? 400 : 500);
        return sendError(res, status, 'Error updating spot', error);
    }
};
//delete a reserve spot submission by id
exports.deleteReserveSpot = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return sendError(res, 400, 'Missing reservation id');

        await reserveSpotService.deleteReserveSpot(id);
        return sendSuccess(res, 200, 'Spot deleted successfully');
    } catch (error) {
        console.error('deleteReserveSpot error:', error);
        return sendError(res, 500, 'Error deleting spot', error);
    }
};
// Helper to send consistent JSON responses
function sendSuccess(res, status, message, data) {
    const payload = { success: true, message };
    if (typeof data !== 'undefined') payload.data = data;
    return res.status(status).json(payload);
}

// Helper to send error responses consistently
function sendError(res, status, message, err) {
    const payload = { success: false, message };
    if (err && process.env.NODE_ENV !== 'production') payload.error = err && (err.message || err);
    return res.status(status).json(payload);
}