# UPI Payment Integration Guide

## Overview
This document explains how to integrate the manual UPI payment system where users can pay via UPI apps (PhonePe, GooglePay, Paytm, etc.) and submit transaction details for admin verification.

## Payment Flow

### 1. **Create UPI Payment Order**

**Endpoint:** `POST /api/payment/upi/create-order`

**Request Body:**
```json
{
  "amount": 3500,
  "customerName": "Sahil Verma",
  "customerEmail": "sahil@yopmail.com",
  "customerPhone": "+919898989899",
  "description": "Quarterly Membership - Zenith Frame Gym",
  "notes": {
    "planType": "quarterly",
    "planName": "Quarterly"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "UPI payment order created successfully",
  "data": {
    "orderId": "UPI_1738612345678_a1b2c3d4e",
    "amount": 3500,
    "currency": "INR",
    "customerEmail": "sahil@yopmail.com",
    "customerName": "Sahil Verma",
    "description": "Quarterly Membership - Zenith Frame Gym",
    "upiInfo": {
      "upiId": "zenithgym@paytm",
      "receiverName": "Zenith Frame Gym"
    }
  }
}
```

### 2. **User Makes Payment via UPI App**

After receiving the order, the frontend should:
1. Display the gym's UPI ID (`zenithgym@paytm`)
2. Show buttons for popular UPI apps (PhonePe, GooglePay, Paytm, etc.)
3. Generate a UPI deep link for each app

**UPI Deep Link Format:**
```javascript
// Generic UPI link
const upiLink = `upi://pay?pa=${upiId}&pn=${receiverName}&am=${amount}&cu=INR&tn=${description}`;

// App-specific deep links:
const phonePeLink = `phonepe://pay?pa=${upiId}&pn=${receiverName}&am=${amount}&cu=INR&tn=${description}`;
const googlePayLink = `gpay://upi/pay?pa=${upiId}&pn=${receiverName}&am=${amount}&cu=INR&tn=${description}`;
const paytmLink = `paytmmp://pay?pa=${upiId}&pn=${receiverName}&am=${amount}&cu=INR&tn=${description}`;

// Example:
// phonepe://pay?pa=zenithgym@paytm&pn=Zenith Frame Gym&am=3500&cu=INR&tn=Quarterly Membership
```

### 3. **Submit Payment Details**

After the user completes the payment in their UPI app, they need to submit the transaction details.

**Endpoint:** `POST /api/payment/upi/submit`

**Content-Type:** `multipart/form-data`

**Form Data:**
- `orderId` (required): The order ID from step 1
- `transactionId` (required): UPI Transaction ID / UTR number
- `upiId` (optional): User's UPI ID (e.g., user@paytm)
- `appUsed` (optional): App name (PhonePe, GooglePay, Paytm, etc.)
- `transactionDate` (optional): Date when payment was made
- `screenshot` (optional): Screenshot of payment confirmation (image file)

**Request Example:**
```javascript
const formData = new FormData();
formData.append('orderId', 'UPI_1738612345678_a1b2c3d4e');
formData.append('transactionId', '402956273815');
formData.append('upiId', 'sahil@paytm');
formData.append('appUsed', 'PhonePe');
formData.append('transactionDate', new Date().toISOString());
formData.append('screenshot', imageFile); // File object

fetch('http://localhost:5000/api/payment/upi/submit', {
  method: 'POST',
  body: formData
});
```

**Response:**
```json
{
  "success": true,
  "message": "UPI payment submitted successfully. Pending admin verification.",
  "data": {
    "success": true,
    "orderId": "UPI_1738612345678_a1b2c3d4e",
    "status": "verification_pending",
    "message": "Payment submitted successfully. Waiting for admin verification."
  }
}
```

### 4. **Admin Verification**

**Get Pending Payments (Admin Only):**

**Endpoint:** `GET /api/payment/upi/pending`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Pending UPI payments fetched successfully",
  "data": [
    {
      "_id": "65abc123...",
      "orderId": "UPI_1738612345678_a1b2c3d4e",
      "amount": 3500,
      "customerName": "Sahil Verma",
      "customerEmail": "sahil@yopmail.com",
      "status": "verification_pending",
      "upiDetails": {
        "transactionId": "402956273815",
        "upiId": "sahil@paytm",
        "appUsed": "PhonePe",
        "transactionDate": "2026-02-03T10:30:00.000Z",
        "screenshot": "uploads/payment-screenshots/payment_1738612345_xyz.jpg",
        "verified": false
      },
      "createdAt": "2026-02-03T10:30:00.000Z"
    }
  ]
}
```

**Verify/Reject Payment (Admin Only):**

**Endpoint:** `PATCH /api/payment/upi/verify/:orderId`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "verified": true,  // true to approve, false to reject
  "remarks": "Payment verified successfully" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment verified successfully",
  "data": {
    "success": true,
    "orderId": "UPI_1738612345678_a1b2c3d4e",
    "status": "paid",
    "verified": true,
    "verifiedAt": "2026-02-03T11:00:00.000Z"
  }
}
```

### 5. **Check Payment Status**

**Endpoint:** `GET /api/payment/order/:orderId`

**Response:**
```json
{
  "success": true,
  "message": "Payment details fetched",
  "data": {
    "_id": "65abc123...",
    "orderId": "UPI_1738612345678_a1b2c3d4e",
    "amount": 3500,
    "currency": "INR",
    "status": "paid",
    "paymentMethod": "upi",
    "customerName": "Sahil Verma",
    "customerEmail": "sahil@yopmail.com",
    "upiDetails": {
      "transactionId": "402956273815",
      "upiId": "sahil@paytm",
      "appUsed": "PhonePe",
      "verified": true,
      "verifiedAt": "2026-02-03T11:00:00.000Z",
      "verifiedBy": "65xyz789..."
    },
    "createdAt": "2026-02-03T10:30:00.000Z"
  }
}
```

## Frontend Implementation Example

### Step 1: Create Order and Show UPI Options

```javascript
async function initiateUpiPayment() {
  try {
    // Create order
    const response = await fetch('/api/payment/upi/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 3500,
        customerName: "Sahil Verma",
        customerEmail: "sahil@yopmail.com",
        customerPhone: "+919898989899",
        description: "Quarterly Membership"
      })
    });

    const result = await response.json();
    
    if (result.success) {
      const { orderId, amount, upiInfo } = result.data;
      
      // Show UPI payment modal
      showUpiPaymentModal(orderId, amount, upiInfo);
    }
  } catch (error) {
    console.error('Error creating order:', error);
  }
}

function showUpiPaymentModal(orderId, amount, upiInfo) {
  const { upiId, receiverName } = upiInfo;
  
  // Create UPI deep links
  const description = 'Gym Membership';
  const phonePeLink = `phonepe://pay?pa=${upiId}&pn=${receiverName}&am=${amount}&cu=INR&tn=${description}`;
  const googlePayLink = `gpay://upi/pay?pa=${upiId}&pn=${receiverName}&am=${amount}&cu=INR&tn=${description}`;
  const paytmLink = `paytmmp://pay?pa=${upiId}&pn=${receiverName}&am=${amount}&cu=INR&tn=${description}`;
  
  // Display modal with:
  // 1. UPI ID to copy
  // 2. QR Code (optional, can generate using UPI link)
  // 3. Buttons for different UPI apps
  // 4. Form to submit transaction details
  
  const modalHTML = `
    <div class="upi-modal">
      <h3>Pay ₹${amount} via UPI</h3>
      
      <div class="upi-id">
        <p>UPI ID: <strong>${upiId}</strong></p>
        <button onclick="copyToClipboard('${upiId}')">Copy</button>
      </div>
      
      <div class="upi-apps">
        <h4>Pay using:</h4>
        <button onclick="window.location.href='${phonePeLink}'">
          <img src="phonepe-icon.png"> PhonePe
        </button>
        <button onclick="window.location.href='${googlePayLink}'">
          <img src="gpay-icon.png"> Google Pay
        </button>
        <button onclick="window.location.href='${paytmLink}'">
          <img src="paytm-icon.png"> Paytm
        </button>
      </div>
      
      <div class="transaction-form">
        <h4>After payment, enter transaction details:</h4>
        <form id="upiSubmitForm">
          <input type="text" name="transactionId" placeholder="Transaction ID / UTR *" required>
          <input type="text" name="upiId" placeholder="Your UPI ID (optional)">
          <select name="appUsed">
            <option value="">Select App Used</option>
            <option value="PhonePe">PhonePe</option>
            <option value="GooglePay">Google Pay</option>
            <option value="Paytm">Paytm</option>
            <option value="Other">Other</option>
          </select>
          <input type="file" name="screenshot" accept="image/*">
          <button type="submit">Submit Payment Details</button>
        </form>
      </div>
    </div>
  `;
  
  // Save orderId for submission
  window.currentOrderId = orderId;
}
```

### Step 2: Submit Transaction Details

```javascript
document.getElementById('upiSubmitForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  formData.append('orderId', window.currentOrderId);
  formData.append('transactionDate', new Date().toISOString());
  
  try {
    const response = await fetch('/api/payment/upi/submit', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (result.success) {
      alert('Payment details submitted! Please wait for admin verification.');
      // Redirect or show success message
    } else {
      alert('Error: ' + result.message);
    }
  } catch (error) {
    console.error('Error submitting payment:', error);
    alert('Failed to submit payment details');
  }
});
```

### Step 3: Poll Payment Status

```javascript
async function checkPaymentStatus(orderId) {
  try {
    const response = await fetch(`/api/payment/order/${orderId}`);
    const result = await response.json();
    
    if (result.success) {
      const payment = result.data;
      
      if (payment.status === 'paid') {
        // Payment verified!
        showSuccessMessage();
      } else if (payment.status === 'failed') {
        // Payment rejected
        showFailureMessage(payment.upiDetails.remarks);
      } else {
        // Still pending
        showPendingMessage();
      }
    }
  } catch (error) {
    console.error('Error checking status:', error);
  }
}

// Poll every 30 seconds
setInterval(() => checkPaymentStatus(orderId), 30000);
```

## Database Schema

The Payment model includes these UPI-specific fields:

```javascript
upiDetails: {
  transactionId: String,      // UTR/Transaction ID
  upiId: String,             // User's UPI ID
  appUsed: String,           // App name (PhonePe, GooglePay, etc.)
  screenshot: String,        // Path to payment screenshot
  transactionDate: Date,     // When payment was made
  verified: Boolean,         // Admin verification status
  verifiedBy: ObjectId,      // Admin who verified
  verifiedAt: Date,          // When verified
  remarks: String            // Admin remarks
}
```

## Configuration

Add these environment variables to your `.env` file:

```env
# UPI Payment Configuration
GYM_UPI_ID=zenithgym@paytm
GYM_NAME=Zenith Frame Gym
```

## Payment States

- `created`: Order created, awaiting payment
- `verification_pending`: User submitted transaction details, awaiting admin verification
- `paid`: Payment verified by admin
- `failed`: Payment rejected by admin

## Security Considerations

1. **Screenshot Validation**: Always verify payment screenshots manually
2. **Transaction ID Verification**: Cross-check transaction IDs with your UPI statement
3. **Amount Matching**: Ensure the paid amount matches the order amount
4. **Duplicate Prevention**: Check for duplicate transaction IDs before approval
5. **File Upload Security**: The middleware restricts uploads to images only (max 5MB)

## Admin Dashboard Integration

Create an admin panel section to:
1. View all pending UPI payments
2. Display payment screenshot
3. Show customer and transaction details
4. Approve/Reject payments with remarks
5. View payment history

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

Common error codes:
- `400`: Bad Request (missing required fields)
- `404`: Payment order not found
- `500`: Server error

## Testing

Test the flow:
1. Create a UPI order
2. Submit fake transaction details
3. Check status (should be "verification_pending")
4. Admin approves/rejects the payment
5. Check status again (should be "paid" or "failed")

## Notes

- No payment gateway fees with this method
- Manual verification required
- Suitable for small to medium businesses
- Consider auto-verification based on bank statement reconciliation for scale
