const paymentService = require('../services/paymentService');

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

// Create payment order
exports.createOrder = async (req, res) => {
  try {
    console.log('Payment order request received:', req.body);
    
    const { amount, currency, customerEmail, customerPhone, customerName, description, notes } = req.body;

    if (!amount) {
      console.error('Amount missing in request');
      return sendError(res, 400, 'Amount is required');
    }

    const orderData = {
      amount: parseFloat(amount),
      currency,
      customerEmail,
      customerPhone,
      customerName,
      description,
      notes,
    };

    console.log('Calling paymentService.createOrder with:', orderData);
    const order = await paymentService.createOrder(orderData);
    console.log('Order created successfully:', order);
    
    return sendSuccess(res, 201, 'Payment order created successfully', order);
  } catch (error) {
    console.error('createOrder error details:', {
      message: error.message,
      statusCode: error.statusCode,
      stack: error.stack
    });
    
    if (error && error.statusCode) {
      return sendError(res, error.statusCode, error.message || 'Error creating order', error);
    }
    return sendError(res, 500, 'Error creating payment order', error);
  }
};

// Verify payment
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return sendError(res, 400, 'Missing required payment fields');
    }

    const verificationData = {
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
    };

    const result = await paymentService.verifyPayment(verificationData);
    return sendSuccess(res, 200, 'Payment verified successfully', result);
  } catch (error) {
    console.error('verifyPayment error:', error);
    if (error && error.statusCode) {
      return sendError(res, error.statusCode, error.message || 'Payment verification failed', error);
    }
    return sendError(res, 500, 'Payment verification failed', error);
  }
};

// Webhook handler
exports.handleWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const webhookData = req.body;

    await paymentService.handleWebhook(webhookData, signature);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('webhook error:', error);
    return res.status(400).json({ success: false, message: 'Webhook processing failed' });
  }
};

// Get payment by order ID
exports.getPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      return sendError(res, 400, 'Order ID is required');
    }

    const payment = await paymentService.getPayment(orderId);
    return sendSuccess(res, 200, 'Payment details fetched', payment);
  } catch (error) {
    console.error('getPayment error:', error);
    if (error && error.statusCode) {
      return sendError(res, error.statusCode, error.message || 'Error fetching payment', error);
    }
    return sendError(res, 500, 'Error fetching payment', error);
  }
};

// Get all payments (admin only)
exports.getAllPayments = async (req, res) => {
  try {
    const payments = await paymentService.getAllPayments();
    return sendSuccess(res, 200, 'Payments fetched successfully', payments);
  } catch (error) {
    console.error('getAllPayments error:', error);
    return sendError(res, 500, 'Error fetching payments', error);
  }
};

// ==================== UPI PAYMENT METHODS ====================

// Create UPI payment order (without Razorpay)
exports.createUpiOrder = async (req, res) => {
  try {
    console.log('UPI order request received:', req.body);
    
    const { amount, customerEmail, customerPhone, customerName, description, notes } = req.body;

    if (!amount || amount <= 0) {
      return sendError(res, 400, 'Valid amount is required');
    }

    if (!customerEmail) {
      return sendError(res, 400, 'Customer email is required');
    }

    const orderData = {
      amount: parseFloat(amount),
      customerEmail,
      customerPhone,
      customerName,
      description,
      notes,
    };

    const order = await paymentService.createUpiOrder(orderData);
    console.log('UPI order created successfully:', order);
    
    return sendSuccess(res, 201, 'UPI payment order created successfully', order);
  } catch (error) {
    console.error('createUpiOrder error:', error);
    if (error && error.statusCode) {
      return sendError(res, error.statusCode, error.message || 'Error creating UPI order', error);
    }
    return sendError(res, 500, 'Error creating UPI payment order', error);
  }
};

// Submit UPI payment details after user makes payment
exports.submitUpiPayment = async (req, res) => {
  try {
    console.log('UPI payment submission received:', req.body);
    
    const { 
      orderId, 
      transactionId, 
      upiId, 
      appUsed, 
      transactionDate 
    } = req.body;

    if (!orderId) {
      return sendError(res, 400, 'Order ID is required');
    }

    if (!transactionId) {
      return sendError(res, 400, 'Transaction ID (UTR) is required');
    }

    // Handle file upload if screenshot is provided
    let screenshotPath = null;
    if (req.file) {
      screenshotPath = req.file.path;
    }

    const paymentData = {
      orderId,
      transactionId,
      upiId,
      appUsed,
      transactionDate: transactionDate || new Date(),
      screenshot: screenshotPath
    };

    const result = await paymentService.submitUpiPayment(paymentData);
    
    return sendSuccess(res, 200, 'UPI payment submitted successfully. Pending admin verification.', result);
  } catch (error) {
    console.error('submitUpiPayment error:', error);
    if (error && error.statusCode) {
      return sendError(res, error.statusCode, error.message || 'Error submitting UPI payment', error);
    }
    return sendError(res, 500, 'Error submitting UPI payment', error);
  }
};

// Admin: Verify UPI payment
exports.verifyUpiPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { verified, remarks } = req.body;
    
    if (!orderId) {
      return sendError(res, 400, 'Order ID is required');
    }

    if (typeof verified !== 'boolean') {
      return sendError(res, 400, 'Verified status (true/false) is required');
    }

    const adminId = req.admin ? req.admin._id : null;

    const result = await paymentService.verifyUpiPayment(orderId, verified, remarks, adminId);
    
    return sendSuccess(res, 200, `Payment ${verified ? 'verified' : 'rejected'} successfully`, result);
  } catch (error) {
    console.error('verifyUpiPayment error:', error);
    if (error && error.statusCode) {
      return sendError(res, error.statusCode, error.message || 'Error verifying UPI payment', error);
    }
    return sendError(res, 500, 'Error verifying UPI payment', error);
  }
};

// Get pending UPI payments for admin
exports.getPendingUpiPayments = async (req, res) => {
  try {
    const payments = await paymentService.getPendingUpiPayments();
    return sendSuccess(res, 200, 'Pending UPI payments fetched successfully', payments);
  } catch (error) {
    console.error('getPendingUpiPayments error:', error);
    return sendError(res, 500, 'Error fetching pending UPI payments', error);
  }
};