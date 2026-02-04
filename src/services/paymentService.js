const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const secrets = require('../config/secrets');

// Initialize Razorpay instance with better error handling
let razorpay;
try {
  if (!secrets.razorpay.keyId || !secrets.razorpay.keySecret) {
    console.error('Razorpay credentials missing. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
  } else {
    razorpay = new Razorpay({
      key_id: secrets.razorpay.keyId,
      key_secret: secrets.razorpay.keySecret,
    });
    console.log('Razorpay initialized successfully');
  }
} catch (error) {
  console.error('Failed to initialize Razorpay:', error);
}

// Create a new payment order
async function createOrder(orderData) {
  const { amount, currency = 'INR', customerEmail, customerPhone, customerName, description, notes = {} } = orderData;

  console.log('Creating order with data:', { amount, currency, customerEmail, customerPhone, customerName });

  if (!amount || amount <= 0) {
    const error = new Error('Amount is required and must be greater than 0');
    error.statusCode = 400;
    throw error;
  }

  if (!secrets.razorpay.keyId || !secrets.razorpay.keySecret) {
    const error = new Error('Razorpay credentials not configured. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env file');
    error.statusCode = 500;
    throw error;
  }

  if (!razorpay) {
    const error = new Error('Razorpay instance not initialized properly');
    error.statusCode = 500;
    throw error;
  }

  try {
    // Create order with Razorpay
    console.log('Creating Razorpay order with amount:', amount * 100, 'paise');
    const razorpayOrder = await razorpay.orders.create({
      amount: amount * 100, // Razorpay expects amount in paise
      currency,
      notes,
    });
    console.log('Razorpay order created:', razorpayOrder.id);

    // Generate unique order ID for our database
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Save order details in database
    const payment = new Payment({
      orderId,
      razorpayOrderId: razorpayOrder.id,
      amount,
      currency,
      customerEmail,
      customerPhone,
      customerName,
      description,
      notes,
      status: 'created',
    });

    await payment.save();

    return {
      orderId,
      razorpayOrderId: razorpayOrder.id,
      amount,
      currency,
      keyId: secrets.razorpay.keyId, // Safe to expose key_id to frontend
    };
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    const err = new Error('Failed to create payment order');
    err.statusCode = 500;
    throw err;
  }
}

// Verify payment signature
async function verifyPayment(verificationData) {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = verificationData;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    const error = new Error('Missing required payment verification fields');
    error.statusCode = 400;
    throw error;
  }

  try {
    // Find payment record
    const payment = await Payment.findOne({ razorpayOrderId });
    if (!payment) {
      const error = new Error('Payment record not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify signature
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', secrets.razorpay.keySecret)
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpaySignature;

    if (isAuthentic) {
      // Update payment record
      payment.razorpayPaymentId = razorpayPaymentId;
      payment.razorpaySignature = razorpaySignature;
      payment.status = 'paid';
      await payment.save();

      return {
        success: true,
        orderId: payment.orderId,
        paymentId: razorpayPaymentId,
        status: 'paid',
      };
    } else {
      // Mark as failed
      payment.status = 'failed';
      await payment.save();

      const error = new Error('Invalid payment signature');
      error.statusCode = 400;
      throw error;
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    if (error.statusCode) throw error;
    
    const err = new Error('Payment verification failed');
    err.statusCode = 500;
    throw err;
  }
}

// Handle webhook events
async function handleWebhook(webhookData, signature) {
  try {
    // Verify webhook signature if you have webhook secret configured
    // const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    // if (webhookSecret) {
    //   const expectedSignature = crypto
    //     .createHmac('sha256', webhookSecret)
    //     .update(JSON.stringify(webhookData))
    //     .digest('hex');
    //   
    //   if (expectedSignature !== signature) {
    //     const error = new Error('Invalid webhook signature');
    //     error.statusCode = 400;
    //     throw error;
    //   }
    // }

    const { event, payload } = webhookData;

    if (event === 'payment.captured') {
      const razorpayPayment = payload.payment.entity;
      const payment = await Payment.findOne({ razorpayOrderId: razorpayPayment.order_id });

      if (payment && payment.status !== 'paid') {
        payment.razorpayPaymentId = razorpayPayment.id;
        payment.status = 'paid';
        await payment.save();
        console.log(`Payment ${razorpayPayment.id} marked as paid via webhook`);
      }
    } else if (event === 'payment.failed') {
      const razorpayPayment = payload.payment.entity;
      const payment = await Payment.findOne({ razorpayOrderId: razorpayPayment.order_id });

      if (payment) {
        payment.status = 'failed';
        await payment.save();
        console.log(`Payment ${razorpayPayment.id} marked as failed via webhook`);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Webhook handling error:', error);
    throw error;
  }
}

// Get payment by order ID
async function getPayment(orderId) {
  const payment = await Payment.findOne({ orderId });
  if (!payment) {
    const error = new Error('Payment not found');
    error.statusCode = 404;
    throw error;
  }
  return payment;
}

// Get all payments
async function getAllPayments() {
  return Payment.find().sort({ createdAt: -1 });
}

// ==================== UPI PAYMENT METHODS ====================

// Create UPI payment order (without Razorpay)
async function createUpiOrder(orderData) {
  const { amount, customerEmail, customerPhone, customerName, description, notes = {} } = orderData;

  if (!amount || amount <= 0) {
    const error = new Error('Amount is required and must be greater than 0');
    error.statusCode = 400;
    throw error;
  }

  if (!customerEmail) {
    const error = new Error('Customer email is required');
    error.statusCode = 400;
    throw error;
  }

  try {
    // Generate unique order ID
    const orderId = `UPI_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Save order details in database
    const payment = new Payment({
      orderId,
      amount,
      currency: 'INR',
      customerEmail,
      customerPhone,
      customerName,
      description,
      notes,
      status: 'created',
      paymentMethod: 'upi',
    });

    await payment.save();

    return {
      orderId,
      amount,
      currency: 'INR',
      customerEmail,
      customerName,
      description,
      // Return UPI details for frontend to display
      upiInfo: {
        upiId: process.env.GYM_UPI_ID || 'gym@paytm', // Your gym's UPI ID
        receiverName: process.env.GYM_NAME || 'Zenith Frame Gym',
      }
    };
  } catch (error) {
    console.error('Error creating UPI order:', error);
    const err = new Error('Failed to create UPI payment order');
    err.statusCode = 500;
    throw err;
  }
}

// Submit UPI payment details after user makes payment
async function submitUpiPayment(paymentData) {
  const { orderId, transactionId, upiId, appUsed, transactionDate, screenshot } = paymentData;

  if (!orderId) {
    const error = new Error('Order ID is required');
    error.statusCode = 400;
    throw error;
  }

  if (!transactionId) {
    const error = new Error('Transaction ID is required');
    error.statusCode = 400;
    throw error;
  }

  try {
    // Find the payment order
    const payment = await Payment.findOne({ orderId });
    
    if (!payment) {
      const error = new Error('Payment order not found');
      error.statusCode = 404;
      throw error;
    }

    if (payment.status === 'paid' || payment.status === 'verification_pending') {
      const error = new Error('Payment already submitted or verified');
      error.statusCode = 400;
      throw error;
    }

    // Update payment with UPI details
    payment.upiDetails = {
      transactionId,
      upiId,
      appUsed,
      transactionDate: new Date(transactionDate),
      screenshot,
      verified: false
    };
    payment.status = 'verification_pending';
    
    await payment.save();

    return {
      success: true,
      orderId: payment.orderId,
      status: payment.status,
      message: 'Payment submitted successfully. Waiting for admin verification.'
    };
  } catch (error) {
    console.error('Error submitting UPI payment:', error);
    if (error.statusCode) throw error;
    
    const err = new Error('Failed to submit UPI payment');
    err.statusCode = 500;
    throw err;
  }
}

// Verify UPI payment (Admin function)
async function verifyUpiPayment(orderId, verified, remarks, adminId) {
  if (!orderId) {
    const error = new Error('Order ID is required');
    error.statusCode = 400;
    throw error;
  }

  try {
    const payment = await Payment.findOne({ orderId });
    
    if (!payment) {
      const error = new Error('Payment order not found');
      error.statusCode = 404;
      throw error;
    }

    if (!payment.upiDetails || !payment.upiDetails.transactionId) {
      const error = new Error('No UPI payment details found for this order');
      error.statusCode = 400;
      throw error;
    }

    // Update verification status
    payment.upiDetails.verified = verified;
    payment.upiDetails.verifiedBy = adminId;
    payment.upiDetails.verifiedAt = new Date();
    if (remarks) {
      payment.upiDetails.remarks = remarks;
    }

    // Update payment status
    payment.status = verified ? 'paid' : 'failed';
    
    await payment.save();

    return {
      success: true,
      orderId: payment.orderId,
      status: payment.status,
      verified: payment.upiDetails.verified,
      verifiedAt: payment.upiDetails.verifiedAt
    };
  } catch (error) {
    console.error('Error verifying UPI payment:', error);
    if (error.statusCode) throw error;
    
    const err = new Error('Failed to verify UPI payment');
    err.statusCode = 500;
    throw err;
  }
}

// Get pending UPI payments
async function getPendingUpiPayments() {
  try {
    const payments = await Payment.find({
      paymentMethod: 'upi',
      status: 'verification_pending'
    }).sort({ createdAt: -1 });

    return payments;
  } catch (error) {
    console.error('Error fetching pending UPI payments:', error);
    const err = new Error('Failed to fetch pending UPI payments');
    err.statusCode = 500;
    throw err;
  }
}

module.exports = {
  createOrder,
  verifyPayment,
  handleWebhook,
  getPayment,
  getAllPayments,
  // UPI payment methods
  createUpiOrder,
  submitUpiPayment,
  verifyUpiPayment,
  getPendingUpiPayments,
};