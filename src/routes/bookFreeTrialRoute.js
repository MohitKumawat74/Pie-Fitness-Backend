const express = require('express');
const router = express.Router();
const controller = require('../controllers/BookFreeTrialController');

router.get('/getform', controller.getAllBookFreeTrials);
router.put('/:id', controller.updateBookFreeTrial);
router.delete('/:id', controller.deleteBookFreeTrial);
router.post('/submit', controller.bookFreeTrial);

module.exports = router;
