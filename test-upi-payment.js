// Quick Test Script for UPI Payment System
// Run this after starting your server to test the UPI payment flow

const API_BASE_URL = 'http://localhost:5000/api/payment';

async function testUpiPaymentFlow() {
    console.log('🧪 Testing UPI Payment System...\n');

    try {
        // Step 1: Create UPI Order
        console.log('1️⃣ Creating UPI order...');
        const orderResponse = await fetch(`${API_BASE_URL}/upi/create-order`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: 3500,
                customerName: 'Test User',
                customerEmail: 'test@example.com',
                customerPhone: '+919999999999',
                description: 'Test Membership Payment',
                notes: {
                    planType: 'quarterly',
                    planName: 'Quarterly'
                }
            })
        });

        const orderResult = await orderResponse.json();
        console.log('✅ Order created:', orderResult);

        if (!orderResult.success) {
            throw new Error('Failed to create order: ' + orderResult.message);
        }

        const orderId = orderResult.data.orderId;
        console.log(`   Order ID: ${orderId}\n`);

        // Step 2: Submit UPI Payment Details
        console.log('2️⃣ Submitting UPI payment details...');
        const formData = new FormData();
        formData.append('orderId', orderId);
        formData.append('transactionId', 'TEST' + Date.now());
        formData.append('upiId', 'testuser@paytm');
        formData.append('appUsed', 'PhonePe');
        formData.append('transactionDate', new Date().toISOString());

        const submitResponse = await fetch(`${API_BASE_URL}/upi/submit`, {
            method: 'POST',
            body: formData
        });

        const submitResult = await submitResponse.json();
        console.log('✅ Payment submitted:', submitResult);

        if (!submitResult.success) {
            throw new Error('Failed to submit payment: ' + submitResult.message);
        }

        console.log(`   Status: ${submitResult.data.status}\n`);

        // Step 3: Check Payment Status
        console.log('3️⃣ Checking payment status...');
        const statusResponse = await fetch(`${API_BASE_URL}/order/${orderId}`);
        const statusResult = await statusResponse.json();
        console.log('✅ Payment status:', statusResult.data);

        if (statusResult.data.status !== 'verification_pending') {
            throw new Error('Expected status to be verification_pending');
        }

        console.log('\n🎉 All tests passed!');
        console.log('\n📝 Next steps:');
        console.log('   1. Use admin endpoint to verify this payment:');
        console.log(`      PATCH ${API_BASE_URL}/upi/verify/${orderId}`);
        console.log('      Body: { "verified": true, "remarks": "Approved" }');
        console.log('   2. Check payment status again to see it marked as "paid"');
        console.log(`\n   Order ID for testing: ${orderId}`);

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error);
    }
}

// Run the test
testUpiPaymentFlow();
