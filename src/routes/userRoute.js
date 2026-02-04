const express = require('express');
const { getUsers, postUser, getUserById, createUser, updateUser, requestPasswordReset, resetPassword } = require('../controllers/userController');
const { handleImageUpload } = require('../middleware/uploadMiddleware');
const router = express.Router();

// List users
router.get('/getuser', getUsers);
// Get single user by id for profile
router.get('/getuser/:id', getUserById);

// Login user
router.post('/login', postUser);
// Register
router.post('/register', handleImageUpload, createUser);
// Update
router.put('/updateuser/:id', handleImageUpload, updateUser);

// Password reset
router.post('/forgot-password', requestPasswordReset);
router.post('/verify-otp', require('../controllers/userController').verifyOtp);
router.post('/reset-password', resetPassword);

module.exports = router;
