const ReserveSpot = require('../models/ReserveSpot');
const reserveSpotService = require('../services/reserveSpotService');

//get all reserve spot submissions
exports.getAllReserveSpots = async (req, res) => {
    try {
        const reserveSpots = await reserveSpotService.getAllReserveSpots();
        return sendSuccess(res, 200, 'Reserve spots fetched successfully', reserveSpots);
    } catch (error) {
        console.error('getAllReserveSpots error:', error);
        return sendError(res, 500, 'Error fetching reserve spots', error);
    }
};
//reserve a spot
exports.reserveSpot = async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return sendError(res, 400, 'Request body is required');
        }

        const newReservation = await reserveSpotService.reserveSpot(req.body);
        return sendSuccess(res, 201, 'Spot reserved successfully', newReservation);
    } catch (error) {
        console.error('reserveSpot error:', error);
        return sendError(res, 500, 'Error reserving spot', error);
    }
};
//update a reserve spot submission by id
exports.updateReserveSpot = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return sendError(res, 400, 'Missing reservation id');

        const updatedReservation = await reserveSpotService.updateReserveSpot(id, req.body);
        return sendSuccess(res, 200, 'Spot updated successfully', updatedReservation);
    } catch (error) {
        console.error('updateReserveSpot error:', error);
        return sendError(res, 500, 'Error updating spot', error);
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