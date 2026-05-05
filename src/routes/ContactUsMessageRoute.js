const express = require('express');
const { postContactUsMessage, getAllContactUsMessages, getContactUsMessageById, updateContactUsMessage } = require('../controllers/ContactUsMessageController');
const { authenticateAdmin } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', authenticateAdmin, getAllContactUsMessages);
router.get('/messages', authenticateAdmin, getAllContactUsMessages);
router.get('/:id', authenticateAdmin, getContactUsMessageById);
router.put('/getform', authenticateAdmin, updateContactUsMessage);
router.put('/:id', authenticateAdmin, updateContactUsMessage);
router.post('/submit', postContactUsMessage);

module.exports = router;
