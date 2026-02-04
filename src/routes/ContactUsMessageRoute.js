const express = require('express');
const { postContactUsMessage, getAllContactUsMessages } = require('../controllers/ContactUsMessageController');
const { authenticateAdmin } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/submit', postContactUsMessage);
router.get('/messages', authenticateAdmin, getAllContactUsMessages);

module.exports = router;
