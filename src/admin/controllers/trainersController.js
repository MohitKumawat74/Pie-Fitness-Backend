const AdminTrainer = require('../models/AdminTrainer');

class TrainersController {
  // Get all trainers
  static async getAllTrainers(req, res) {
    try {
      const { status, specialization, search } = req.query;
      
      const filters = {};
      if (status) filters.status = status;
      if (specialization) filters.specialization = specialization;
      if (search) filters.search = search;

      const trainers = await AdminTrainer.getAllTrainers(filters);

      res.status(200).json({
        success: true,
        data: trainers
      });

    } catch (error) {
      console.error('Get all trainers error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch trainers'
      });
    }
  }

  // Get trainer by ID
  static async getTrainerById(req, res) {
    try {
      const { trainerId } = req.params;

      const trainer = await AdminTrainer.getTrainerById(trainerId);

      if (!trainer) {
        return res.status(404).json({
          success: false,
          message: 'Trainer not found'
        });
      }

      res.status(200).json({
        success: true,
        data: trainer
      });

    } catch (error) {
      console.error('Get trainer by ID error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch trainer'
      });
    }
  }

  // Create new trainer
  static async createTrainer(req, res) {
    try {
      const trainerData = req.body;

      const newTrainer = await AdminTrainer.createTrainer(trainerData);

      res.status(201).json({
        success: true,
        message: 'Trainer created successfully',
        data: newTrainer
      });

    } catch (error) {
      console.error('Create trainer error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create trainer'
      });
    }
  }

  // Update trainer
  static async updateTrainer(req, res) {
    try {
      const { trainerId } = req.params;
      const updateData = req.body;

      const updatedTrainer = await AdminTrainer.updateTrainer(trainerId, updateData);

      if (!updatedTrainer) {
        return res.status(404).json({
          success: false,
          message: 'Trainer not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Trainer updated successfully',
        data: updatedTrainer
      });

    } catch (error) {
      console.error('Update trainer error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update trainer'
      });
    }
  }

  // Delete trainer
  static async deleteTrainer(req, res) {
    try {
      const { trainerId } = req.params;

      const deletedTrainer = await AdminTrainer.deleteTrainer(trainerId);

      if (!deletedTrainer) {
        return res.status(404).json({
          success: false,
          message: 'Trainer not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Trainer deleted successfully'
      });

    } catch (error) {
      console.error('Delete trainer error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete trainer'
      });
    }
  }

  // Get trainer statistics
  static async getTrainerStats(req, res) {
    try {
      const stats = await AdminTrainer.getTrainerStats();

      res.status(200).json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Get trainer stats error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch trainer statistics'
      });
    }
  }

  // Get trainer schedule
  static async getTrainerSchedule(req, res) {
    try {
      const { trainerId } = req.params;
      const trainer = await AdminTrainer.getTrainerById(trainerId);

      if (!trainer) {
        return res.status(404).json({ success: false, message: 'Trainer not found' });
      }

      res.status(200).json({ success: true, data: { schedule: trainer.schedule || [] } });
    } catch (error) {
      console.error('Get trainer schedule error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to fetch schedule' });
    }
  }

  // Update trainer schedule
  static async updateTrainerSchedule(req, res) {
    try {
      const { trainerId } = req.params;
      const { schedule } = req.body;

      const updatedTrainer = await AdminTrainer.updateTrainer(trainerId, { schedule });

      if (!updatedTrainer) {
        return res.status(404).json({ success: false, message: 'Trainer not found' });
      }

      res.status(200).json({ success: true, message: 'Schedule updated', data: { schedule: updatedTrainer.schedule } });
    } catch (error) {
      console.error('Update trainer schedule error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to update schedule' });
    }
  }
}

module.exports = TrainersController;