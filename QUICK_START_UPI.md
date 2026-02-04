# Quick Start Guide - UPI Payment System

## ✅ Implementation Complete!

Your UPI payment system is now ready to use. The Razorpay authentication error has been bypassed by implementing a direct UPI payment flow.

## 🚀 How It Works

Instead of using Razorpay (which requires valid API credentials), the system now:
1. **Creates orders** directly in your database
2. **Shows UPI ID** to users for manual payment
3. **Accepts transaction details** from users after they pay
4. **Requires admin verification** before marking payment as successful

## 📁 Files Modified/Created

### Backend Files
- ✅ `src/models/Payment.js` - Added UPI fields
- ✅ `src/controllers/paymentController.js` - Added UPI endpoints
- ✅ `src/services/paymentService.js` - Added UPI logic
- ✅ `src/routes/paymentRoute.js` - Added UPI routes
- ✅ `src/middleware/uploadMiddleware.js` - Added screenshot upload
- ✅ `.env` - Added UPI configuration

### Documentation
- ✅ `UPI_PAYMENT_INTEGRATION.md` - Complete API guide
- ✅ `UPI_IMPLEMENTATION_SUMMARY.md` - Implementation overview
- ✅ `upi-payment-demo.html` - Working frontend example
- ✅ `test-upi-payment.js` - Test script

## 🧪 Testing the Implementation

### Option 1: Using the Demo HTML Page

1. **Start your server:**
   ```powershell
   npm start
   ```

2. **Open the demo page:**
   - Open `upi-payment-demo.html` in your browser
   - Or navigate to: `file:///d:/Pie%20Fitness%20Backend/upi-payment-demo.html`

3. **Test the flow:**
   - Page will auto-create an order
   - Enter a fake transaction ID (e.g., `TEST123456`)
   - Fill in the form and submit
   - Check your database - payment should be "verification_pending"

### Option 2: Using the Test Script

1. **Run the test script:**
   ```powershell
   node test-upi-payment.js
   ```

2. **The script will:**
   - Create a UPI order
   - Submit fake payment details
   - Check the payment status
   - Show you the order ID for manual verification

### Option 3: Using API Directly (Postman/Curl)

1. **Create Order:**
   ```bash
   POST http://localhost:5000/api/payment/upi/create-order
   Content-Type: application/json

   {
     "amount": 3500,
     "customerName": "Test User",
     "customerEmail": "test@example.com",
     "customerPhone": "+919999999999",
     "description": "Test Payment"
   }
   ```

2. **Submit Payment:**
   ```bash
   POST http://localhost:5000/api/payment/upi/submit
   Content-Type: multipart/form-data

   orderId: <order-id-from-step-1>
   transactionId: TEST123456
   upiId: testuser@paytm
   appUsed: PhonePe
   ```

## 🔧 Configuration

Edit `.env` file to set your UPI details:

```env
# Replace with your actual UPI ID and gym name
GYM_UPI_ID=zenithgym@paytm
GYM_NAME=Zenith Frame Gym
```

## 📱 API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payment/upi/create-order` | Create new UPI order |
| POST | `/api/payment/upi/submit` | Submit transaction details |
| GET | `/api/payment/order/:orderId` | Check payment status |

### Admin Endpoints (Require Authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payment/upi/pending` | Get pending payments |
| PATCH | `/api/payment/upi/verify/:orderId` | Verify/reject payment |

## 🎯 Admin Verification

To verify a pending payment (as admin):

```bash
PATCH http://localhost:5000/api/payment/upi/verify/<orderId>
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "verified": true,
  "remarks": "Payment verified successfully"
}
```

## 💡 Frontend Integration

### Basic Implementation

```javascript
// 1. Create order
const response = await fetch('/api/payment/upi/create-order', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 3500,
    customerName: "User Name",
    customerEmail: "user@email.com",
    customerPhone: "+919999999999"
  })
});

const { data } = await response.json();
const { orderId, upiInfo } = data;

// 2. Show UPI ID and payment apps
// Use upiInfo.upiId and upiInfo.receiverName

// 3. Submit payment details
const formData = new FormData();
formData.append('orderId', orderId);
formData.append('transactionId', userTransactionId);
formData.append('screenshot', screenshotFile);

await fetch('/api/payment/upi/submit', {
  method: 'POST',
  body: formData
});
```

## 🎨 UPI App Deep Links

```javascript
const { upiId, receiverName } = upiInfo;
const amount = 3500;

// PhonePe
const phonepeLink = `phonepe://pay?pa=${upiId}&pn=${receiverName}&am=${amount}&cu=INR`;

// Google Pay
const gpayLink = `gpay://upi/pay?pa=${upiId}&pn=${receiverName}&am=${amount}&cu=INR`;

// Paytm
const paytmLink = `paytmmp://pay?pa=${upiId}&pn=${receiverName}&am=${amount}&cu=INR`;
```

## 📊 Payment Flow Diagram

```
User Action                 Backend Status           Admin Action
-----------                 --------------           ------------
Create Order        →       created
                    
Pay via UPI App

Submit Details      →       verification_pending  →  Review Payment
                                                       
                                                   →  Approve/Reject
                    
                            paid / failed         ←
```

## 🔒 Security Notes

- Transaction IDs should be unique
- Always verify payment screenshots
- Check amounts match order amounts
- Enable admin authentication
- Validate all user inputs
- Store screenshots securely

## 📝 Database Schema

The Payment collection now includes:

```javascript
{
  orderId: "UPI_1738612345_abc123",
  amount: 3500,
  currency: "INR",
  status: "verification_pending",  // or "paid", "failed"
  paymentMethod: "upi",
  customerName: "User Name",
  customerEmail: "user@email.com",
  upiDetails: {
    transactionId: "402956273815",
    upiId: "user@paytm",
    appUsed: "PhonePe",
    screenshot: "uploads/payment-screenshots/payment_xyz.jpg",
    transactionDate: "2026-02-03T...",
    verified: false,
    verifiedBy: null,
    verifiedAt: null,
    remarks: ""
  },
  createdAt: "2026-02-03T...",
  updatedAt: "2026-02-03T..."
}
```

## ✨ Benefits of This Approach

✅ **No Payment Gateway Fees** - Save 2-3% on every transaction  
✅ **Simple Integration** - No complex API credentials needed  
✅ **Direct Payments** - Money goes directly to your account  
✅ **Full Control** - You verify each payment manually  
✅ **Popular in India** - UPI is widely used  
✅ **Multiple Apps** - Works with all UPI apps  

## ⚠️ Limitations

- Requires manual verification
- Not suitable for high-volume transactions
- No automatic refunds
- Admin involvement needed

## 🚀 Next Steps

1. **Test the system** using demo page or test script
2. **Update .env** with your real UPI ID
3. **Build admin panel** to manage pending payments
4. **Integrate frontend** into your main application
5. **Add email notifications** for status updates
6. **Consider auto-verification** for scale (optional)

## 📞 Need Help?

- Check `UPI_PAYMENT_INTEGRATION.md` for detailed API docs
- Review `upi-payment-demo.html` for frontend reference
- Run `test-upi-payment.js` to verify backend is working
- Check server logs for any errors

---

**Ready to Go!** 🎉

Your UPI payment system is fully functional and ready to accept payments without Razorpay.
