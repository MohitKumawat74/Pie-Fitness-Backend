const express = require('express');
const router = express.Router();
const { logAdminActivity } = require('../middleware/adminMiddleware');
const PlansController = require('../controllers/plansController');

// Get all plans
router.get('/',
  logAdminActivity('view', 'plans'),
  PlansController.getAllPlans
);

// Get plan by ID
router.get('/:planId',
  logAdminActivity('view', 'plan_details'),
  PlansController.getPlanById
);

// Create new plan
router.post('/',
  logAdminActivity('create', 'plan'),
  PlansController.createPlan
);

// Update plan
router.put('/:planId',
  logAdminActivity('update', 'plan'),
  PlansController.updatePlan
);

// Delete plan
router.delete('/:planId',
  logAdminActivity('delete', 'plan'),
  PlansController.deletePlan
);

module.exports = router;
