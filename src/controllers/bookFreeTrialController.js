const BookFreeTrial = require('../models/BookFreeTrial');
const bookFreeTrialService = require('../services/bookFreeTrialService');
const { createAdminNotification } = require('../services/notificationService');

function formatBookFreeTrial(doc, { includePreferredFields = false } = {}) {
    const booking = typeof doc?.toObject === 'function' ? doc.toObject() : doc;
    if (!booking) return booking;

    const response = {
        id: booking._id ? booking._id.toString() : undefined,
        first_name: booking.first_name,
        last_name: booking.last_name,
        email: booking.email,
        phone: booking.phone,
        notes: booking.notes,
        createdAt: booking.createdAt
    };

    if (includePreferredFields) {
        response.preferred_class_type = booking.preferred_class_type;
        response.preferred_class_date = booking.preferred_class_date;
        response.preferred_class_time = booking.preferred_class_time;
    }

    return response;
}

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
        return sendSuccess(res, 200, 'Book free trials fetched', bookFreeTrials.map((booking) => formatBookFreeTrial(booking, { includePreferredFields: true })));
    } catch (error) {
        console.error('getAllBookFreeTrials error:', error);
        return sendError(res, 500, 'Error fetching book free trials', error);
    }
};

exports.getBookFreeTrialById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return sendError(res, 400, 'Missing booking id');

        const booking = await BookFreeTrial.findById(id).lean();
        if (!booking) return sendError(res, 404, 'Booking not found');

        return sendSuccess(res, 200, 'Book free trial fetched successfully', formatBookFreeTrial(booking));
    } catch (error) {
        console.error('getBookFreeTrialById error:', error);
        const status = error.statusCode || (error.name === 'CastError' ? 400 : 500);
        return sendError(res, status, 'Error fetching book free trial', error);
    }
};

exports.bookFreeTrial = async (req, res) => {
    try {
        // Basic input validation - service should perform deeper validation
        if (!req.body || Object.keys(req.body).length === 0) {
            return sendError(res, 400, 'Request body is required');
        }

        const newBooking = await bookFreeTrialService.bookFreeTrial(req.body);
        await createAdminNotification({
            title: 'New free trial request',
            message: `${newBooking.first_name} ${newBooking.last_name} booked a free trial`,
            type: 'general',
            link: '/admin/book-free-trial',
            metadata: {
                bookingId: newBooking._id.toString(),
                email: newBooking.email,
                phone: newBooking.phone,
                preferred_class_type: newBooking.preferred_class_type,
                preferred_class_date: newBooking.preferred_class_date,
                preferred_class_time: newBooking.preferred_class_time
            },
            createdBy: null
        });
        return sendSuccess(res, 201, 'Free trial booked successfully', formatBookFreeTrial(newBooking));
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