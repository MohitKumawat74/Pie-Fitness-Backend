# Razorpay Payment Integration

This project now includes complete Razorpay payment integration with the following endpoints:

## Backend Endpoints

### 1. Create Payment Order
```
POST /api/payment/create-order
```

**Request Body:**
```json
{
  "amount": 500,
  "currency": "INR",
  "customerEmail": "customer@example.com",
  "customerPhone": "9876543210", 
  "customerName": "John Doe",
  "description": "Gym Membership Payment",
  "notes": {
    "membership_type": "premium"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment order created successfully",
  "data": {
    "orderId": "order_1234567890_abc123",
    "razorpayOrderId": "order_razorpay_id",
    "amount": 500,
    "currency": "INR",
    "keyId": "rzp_test_xxxxxx"
  }
}
```

### 2. Verify Payment
```
POST /api/payment/verify
```

**Request Body:**
```json
{
  "razorpay_order_id": "order_razorpay_id",
  "razorpay_payment_id": "pay_razorpay_id",
  "razorpay_signature": "signature_hash"
}
```

### 3. Get Payment Details
```
GET /api/payment/order/:orderId
```

### 4. Webhook (for Razorpay)
```
POST /api/payment/webhook
```

### 5. Get All Payments (Admin only)
```
GET /api/payment/payments
Headers: {
  "Authorization": "Bearer your_admin_token"
  // OR
  "x-admin-token": "your_admin_token"
}
```

## Environment Variables Required

Add these to your `.env` file:

```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
RAZORPAY_KEY_SECRET=your_secret_key_here
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
```

## Frontend Integration Example

### HTML
```html
<!DOCTYPE html>
<html>
<head>
    <title>Payment Integration</title>
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</head>
<body>
    <button onclick="initiatePayment()">Pay Now</button>
    
    <script>
        async function initiatePayment() {
            try {
                // Step 1: Create order
                const orderResponse = await fetch('/api/payment/create-order', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        amount: 500,
                        customerEmail: 'customer@example.com',
                        customerPhone: '9876543210',
                        customerName: 'John Doe',
                        description: 'Gym Membership Payment'
                    })
                });
                
                const orderData = await orderResponse.json();
                
                if (!orderData.success) {
                    alert('Failed to create order');
                    return;
                }
                
                // Step 2: Open Razorpay checkout
                const options = {
                    key: orderData.data.keyId,
                    amount: orderData.data.amount * 100,
                    currency: orderData.data.currency,
                    name: 'Pie Fitness Gym',
                    description: 'Gym Membership Payment',
                    order_id: orderData.data.razorpayOrderId,
                    handler: async function(response) {
                        // Step 3: Verify payment
                        await verifyPayment({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        });
                    },
                    prefill: {
                        name: 'John Doe',
                        email: 'customer@example.com',
                        contact: '9876543210'
                    },
                    theme: {
                        color: '#3399cc'
                    }
                };
                
                const rzp = new Razorpay(options);
                rzp.open();
                
            } catch (error) {
                console.error('Payment initiation error:', error);
                alert('Payment initiation failed');
            }
        }
        
        async function verifyPayment(paymentData) {
            try {
                const response = await fetch('/api/payment/verify', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(paymentData)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert('Payment successful!');
                    console.log('Payment verified:', result.data);
                } else {
                    alert('Payment verification failed');
                }
                
            } catch (error) {
                console.error('Payment verification error:', error);
                alert('Payment verification failed');
            }
        }
    </script>
</body>
</html>
```

### React Example
```jsx
import React, { useState } from 'react';

const PaymentComponent = () => {
    const [loading, setLoading] = useState(false);

    const initiatePayment = async (paymentData) => {
        setLoading(true);
        
        try {
            // Create order
            const orderResponse = await fetch('/api/payment/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(paymentData)
            });
            
            const orderData = await orderResponse.json();
            
            if (!orderData.success) {
                throw new Error('Order creation failed');
            }

            // Load Razorpay script dynamically
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => {
                const options = {
                    key: orderData.data.keyId,
                    amount: orderData.data.amount * 100,
                    currency: orderData.data.currency,
                    name: 'Pie Fitness Gym',
                    order_id: orderData.data.razorpayOrderId,
                    handler: verifyPayment,
                    prefill: {
                        name: paymentData.customerName,
                        email: paymentData.customerEmail,
                        contact: paymentData.customerPhone
                    }
                };
                
                const rzp = new window.Razorpay(options);
                rzp.open();
            };
            document.body.appendChild(script);
            
        } catch (error) {
            alert('Payment failed: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const verifyPayment = async (response) => {
        try {
            const verifyResponse = await fetch('/api/payment/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature
                })
            });
            
            const result = await verifyResponse.json();
            
            if (result.success) {
                alert('Payment successful!');
            } else {
                alert('Payment verification failed');
            }
        } catch (error) {
            alert('Payment verification error');
        }
    };

    return (
        <button 
            onClick={() => initiatePayment({
                amount: 500,
                customerName: 'John Doe',
                customerEmail: 'john@example.com',
                customerPhone: '9876543210',
                description: 'Gym Membership'
            })}
            disabled={loading}
        >
            {loading ? 'Processing...' : 'Pay Now'}
        </button>
    );
};

export default PaymentComponent;
```

## Testing

1. **Test Mode**: Use Razorpay test credentials
2. **Test Cards**: Use Razorpay test card numbers
3. **Webhook Testing**: Use ngrok or similar for local webhook testing

## Security Notes

- Never expose `RAZORPAY_KEY_SECRET` to frontend
- Always verify payments on the backend
- Use HTTPS in production
- Validate webhook signatures for production webhooks
- Consider implementing rate limiting for payment endpoints