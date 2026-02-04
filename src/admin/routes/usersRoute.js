const express = require('express');
const router = express.Router();
const { logAdminActivity } = require('../middleware/adminMiddleware');
const UsersController = require('../controllers/usersController');

// Get all users
router.get('/',
  logAdminActivity('view', 'users'),
  UsersController.getAllUsers
);

// Get user statistics
router.get('/stats',
  logAdminActivity('view', 'user_stats'),
  UsersController.getUserStats
);

// Search users
router.get('/search',
  logAdminActivity('search', 'users'),
  UsersController.searchUsers
);

// Export users
router.get('/export',
  logAdminActivity('export', 'users'),
  UsersController.exportUsers
);

// Get user by ID
router.get('/:userId',
  logAdminActivity('view', 'user_details'),
  UsersController.getUserById
);

// Update user
router.put('/:userId',
  logAdminActivity('update', 'user'),
  UsersController.updateUser
);

// Update user status
router.put('/:userId/status',
  logAdminActivity('update', 'user_status'),
  UsersController.updateUserStatus
);

// Delete user
router.delete('/:userId',
  logAdminActivity('delete', 'user'),
  UsersController.deleteUser
);

module.exports = router;