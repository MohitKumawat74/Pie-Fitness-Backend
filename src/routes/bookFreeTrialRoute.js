const express = require('express');
const router = express.Router();
const controller = require('../controllers/bookFreeTrialController');

router.get('/', controller.getAllBookFreeTrials);
router.get('/getform', controller.getAllBookFreeTrials);
router.get('/:id', controller.getBookFreeTrialById);
router.put('/:id', controller.updateBookFreeTrial);
router.delete('/:id', controller.deleteBookFreeTrial);
router.post('/submit', controller.bookFreeTrial);

module.exports = router;
