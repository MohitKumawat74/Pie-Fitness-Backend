const BookFreeTrial = require('../models/BookFreeTrial');
const bookFreeTrialService = require('../services/bookFreeTrialService');

// Helper to send consistent JSON responses
function sendSuccess(res, status, message, data) {
    const payload = { success: true, message };
    if (typeof data !== 'undefined') payload.data = data;
    return res.status(status).json(payload);
}

function sendError(res, status, message, err) {
    // Avoid leaking internal error objects to clients in production
    const payload = { success: false, message };
    if (err && process.env.NODE_ENV !== 'production') payload.error = err && (err.message || err);
    return res.status(status).json(payload);
}

exports.getAllBookFreeTrials = async (req, res) => {
    try {
        const bookFreeTrials = await bookFreeTrialService.getAllBookFreeTrials();
        return sendSuccess(res, 200, 'Book free trials fetched', bookFreeTrials);
    } catch (error) {
        console.error('getAllBookFreeTrials error:', error);
        return sendError(res, 500, 'Error fetching book free trials', error);
    }
};

exports.bookFreeTrial = async (req, res) => {
    try {
        // Basic input validation - service should perform deeper validation
        if (!req.body || Object.keys(req.body).length === 0) {
            return sendError(res, 400, 'Request body is required');
        }

        const newBooking = await bookFreeTrialService.bookFreeTrial(req.body);
        return sendSuccess(res, 201, 'Free trial booked successfully', newBooking);
    } catch (error) {
        console.error('bookFreeTrial error:', error);
        // Map known error shapes to status codes if service throws them (e.g., error.code)
        if (error && error.statusCode) return sendError(res, error.statusCode, error.message || 'Error booking free trial', error);
        return sendError(res, 500, 'Error booking free trial', error);
    }
};

exports.updateBookFreeTrial = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return sendError(res, 400, 'Missing booking id');

        const updatedBooking = await bookFreeTrialService.updateBookFreeTrial(id, req.body);
        if (!updatedBooking) return sendError(res, 404, 'Booking not found');
        return sendSuccess(res, 200, 'Booking updated successfully', updatedBooking);
    } catch (error) {
        console.error('updateBookFreeTrial error:', error);
        if (error && error.statusCode) return sendError(res, error.statusCode, error.message || 'Error updating book free trial', error);
        return sendError(res, 500, 'Error updating book free trial', error);
    }
};

exports.deleteBookFreeTrial = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return sendError(res, 400, 'Missing booking id');

        const deleted = await bookFreeTrialService.deleteBookFreeTrial(id);
        if (!deleted) return sendError(res, 404, 'Booking not found');
        return res.status(204).send();
    } catch (error) {
        console.error('deleteBookFreeTrial error:', error);
        if (error && error.statusCode) return sendError(res, error.statusCode, error.message || 'Error deleting book free trial', error);
        return sendError(res, 500, 'Error deleting book free trial', error);
    }
};