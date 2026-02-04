const express = require('express');
const router = express.Router();
const { logAdminActivity } = require('../middleware/adminMiddleware');
const MembershipsController = require('../controllers/membershipsController');

// Get all memberships
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

// Create new membership
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