const express = require('express');
const router = express.Router();

const ClassesController = require('../admin/controllers/classesController');
const TrainersController = require('../admin/controllers/trainersController');
const publicPlansController = require('../controllers/publicPlansController');

// Public classes
router.get('/classes', ClassesController.getAllClasses);
router.get('/classes/:classId', ClassesController.getClassById);

// Public trainers
router.get('/trainers', TrainersController.getAllTrainers);
router.get('/trainers/:trainerId', TrainersController.getTrainerById);

// Public plans
router.get('/plans', publicPlansController.getAllPlans);
router.get('/plans/:planId', publicPlansController.getPlanById);

module.exports = router;
