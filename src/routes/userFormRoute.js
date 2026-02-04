const express = require('express');
const router = express.Router();
const controller = require('../controllers/userFormController');

router.get('/:id', controller.getForm);

// PATCH /:id   -> partial update of a form (save step)
router.patch('/:id', controller.updateForm);

// POST /submit -> submit or create+submit a form (accepts id or email/phone to locate draft)
router.post('/submit', controller.submitForm);

module.exports = router;
