const express = require('express');
const router = express.Router();
const { logAdminActivity } = require('../middleware/adminMiddleware');
const TrainersController = require('../controllers/trainersController');

// Get all trainers
router.get('/',
  logAdminActivity('view', 'trainers'),
  TrainersController.getAllTrainers
);

// Get trainer statistics
router.get('/stats',
  logAdminActivity('view', 'trainer_stats'),
  TrainersController.getTrainerStats
);

// Get trainer by ID
router.get('/:trainerId',
  logAdminActivity('view', 'trainer_details'),
  TrainersController.getTrainerById
);

// Create new trainer
router.post('/',
  logAdminActivity('create', 'trainer'),
  TrainersController.createTrainer
);

// Update trainer
router.put('/:trainerId',
  logAdminActivity('update', 'trainer'),
  TrainersController.updateTrainer
);

// Delete trainer
router.delete('/:trainerId',
  logAdminActivity('delete', 'trainer'),
  TrainersController.deleteTrainer
);

// Get trainer schedule
router.get('/:trainerId/schedule',
  logAdminActivity('view', 'trainer_schedule'),
  TrainersController.getTrainerSchedule
);

// Update trainer schedule
router.put('/:trainerId/schedule',
  logAdminActivity('update', 'trainer_schedule'),
  TrainersController.updateTrainerSchedule
);

module.exports = router;