const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { authenticateUser } = require('../middleware/authMiddleware');

// Create a new subscription
// Create a new subscription
router.post('/subscribe', authenticateUser, subscriptionController.createSubscription);
// Upgrade / update an existing subscription by id
router.patch('/subscribe/:id', authenticateUser, subscriptionController.updateSubscription);
// Get subscription details by id
router.get('/subscribe/:id', authenticateUser, subscriptionController.getSubscriptionById);
// Cancel (delete) a subscription by id
router.delete('/subscribe/:id', authenticateUser, subscriptionController.deleteSubscription);

module.exports = router;