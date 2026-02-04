const express = require('express');
const router = express.Router();
const { logAdminActivity, authenticateAdmin } = require('../middleware/adminMiddleware');
const AuthController = require('../controllers/authController');

// Admin authentication routes
router.post('/login', 
  logAdminActivity('login', 'admin'),
  AuthController.login
);

router.post('/logout',
  authenticateAdmin,
  logAdminActivity('logout', 'admin'),
  AuthController.logout
);

router.post('/refresh',
  authenticateAdmin,
  logAdminActivity('refresh_token', 'admin'),
  AuthController.refreshToken
);

router.get('/profile',
  authenticateAdmin,
  logAdminActivity('view', 'admin_profile'),
  AuthController.getProfile
);

router.put('/profile',
  authenticateAdmin,
  logAdminActivity('update', 'admin_profile'),
  AuthController.updateProfile
);

router.put('/change-password',
  authenticateAdmin,
  logAdminActivity('change_password', 'admin'),
  AuthController.changePassword
);

module.exports = router;