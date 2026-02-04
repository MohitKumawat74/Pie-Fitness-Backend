const express = require('express');
const router = express.Router();
const { logAdminActivity } = require('../middleware/adminMiddleware');
const ClassesController = require('../controllers/classesController');

// Get all classes
router.get('/',
  logAdminActivity('view', 'classes'),
  ClassesController.getAllClasses
);

// Get class statistics
router.get('/stats',
  logAdminActivity('view', 'class_stats'),
  ClassesController.getClassStats
);

// Get class by ID
router.get('/:classId',
  logAdminActivity('view', 'class_details'),
  ClassesController.getClassById
);

// Create new class
router.post('/',
  logAdminActivity('create', 'class'),
  ClassesController.createClass
);

// Update class
router.put('/:classId',
  logAdminActivity('update', 'class'),
  ClassesController.updateClass
);

// Delete class
router.delete('/:classId',
  logAdminActivity('delete', 'class'),
  ClassesController.deleteClass
);

module.exports = router;