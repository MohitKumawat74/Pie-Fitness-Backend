const express = require('express');
const router = express.Router();
const { logAdminActivity } = require('../middleware/adminMiddleware');
const MembershipsController = require('../controllers/membershipsController');

// Create user subscription (assign plan to user) - MUST BE BEFORE generic POST route
router.post('/user-subscriptions/create',
  logAdminActivity('create', 'user_subscription'),
  MembershipsController.createUserSubscription
);

// Get all user subscriptions (can also use ?type=subscriptions on main GET)
router.get('/user-subscriptions/all',
  logAdminActivity('view', 'user_subscriptions'),
  MembershipsController.getAllUserSubscriptions
);

// Get user subscription by ID
router.get('/user-subscriptions/:subscriptionId',
  logAdminActivity('view', 'user_subscription_details'),
  MembershipsController.getUserSubscriptionById
);

// Get all memberships (or subscriptions if ?type=subscriptions)
router.get('/',
  logAdminActivity('view', 'memberships'),
  MembershipsController.getAllMemberships
);

// Get membership statistics
router.get('/stats/overview',
  logAdminActivity('view', 'membership_stats'),
  MembershipsController.getMembershipStats
);

// Get membership by ID
router.get('/:id',
  logAdminActivity('view', 'membership_details'),
  MembershipsController.getMembershipById
);

// Create new membership (plan) OR user subscription
router.post('/',
  logAdminActivity('create', 'membership'),
  MembershipsController.createMembership
);

// Update membership
router.put('/:id',
  logAdminActivity('update', 'membership'),
  MembershipsController.updateMembership
);

// Delete membership
router.delete('/:id',
  logAdminActivity('delete', 'membership'),
  MembershipsController.deleteMembership
);

// Bulk actions
router.post('/bulk-action',
  logAdminActivity('bulk_update', 'memberships'),
  MembershipsController.bulkActions
);

module.exports = router;