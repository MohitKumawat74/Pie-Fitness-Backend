// config/secrets.js
const secrets = {
  secretKey: process.env.SECRET_KEY, // This could be for JWT or other secret tokens
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
  },
};

module.exports = secrets;
