const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateAdmin } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

// Razorpay payment routes
// Create payment order
router.post('/create-order', paymentController.createOrder);

// Verify payment
router.post('/verify', paymentController.verifyPayment);

// Webhook endpoint (no auth required for Razorpay webhooks)
router.post('/webhook', paymentController.handleWebhook);

// Get payment by order ID
router.get('/order/:orderId', paymentController.getPayment);

// Get all payments (admin only)
router.get('/payments', authenticateAdmin, paymentController.getAllPayments);

// ==================== UPI PAYMENT ROUTES ====================

// Create UPI payment order (no Razorpay integration)
router.post('/upi/create-order', paymentController.createUpiOrder);

// Submit UPI payment details with optional screenshot
router.post('/upi/submit', upload.single('screenshot'), paymentController.submitUpiPayment);

// Admin: Verify UPI payment
router.patch('/upi/verify/:orderId', authenticateAdmin, paymentController.verifyUpiPayment);

// Admin: Get pending UPI payments
router.get('/upi/pending', authenticateAdmin, paymentController.getPendingUpiPayments);

module.exports = router;