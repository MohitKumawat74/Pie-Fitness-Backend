const AdminClass = require('../models/AdminClass');

class ClassesController {
  // Get all classes
  static async getAllClasses(req, res) {
    try {
      const { category, difficulty, instructor, isActive } = req.query;
      
      const filters = {};
      if (category) filters.category = category;
      if (difficulty) filters.difficulty = difficulty;
      if (instructor) filters.instructor = instructor;
      if (isActive !== undefined) filters.isActive = isActive === 'true';

      const classes = await AdminClass.getAllClasses(filters);

      res.status(200).json({
        success: true,
        data: classes
      });

    } catch (error) {
      console.error('Get all classes error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch classes'
      });
    }
  }

  // Get class by ID
  static async getClassById(req, res) {
    try {
      const { classId } = req.params;

      const classData = await AdminClass.getClassById(classId);

      if (!classData) {
        return res.status(404).json({
          success: false,
          message: 'Class not found'
        });
      }

      res.status(200).json({
        success: true,
        data: classData
      });

    } catch (error) {
      console.error('Get class by ID error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch class'
      });
    }
  }

  // Create new class
  static async createClass(req, res) {
    try {
      const classData = req.body;

      const newClass = await AdminClass.createClass(classData);

      res.status(201).json({
        success: true,
        message: 'Class created successfully',
        data: newClass
      });

    } catch (error) {
      console.error('Create class error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create class'
      });
    }
  }

  // Update class
  static async updateClass(req, res) {
    try {
      const { classId } = req.params;
      const updateData = req.body;

      const updatedClass = await AdminClass.updateClass(classId, updateData);

      if (!updatedClass) {
        return res.status(404).json({
          success: false,
          message: 'Class not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Class updated successfully',
        data: updatedClass
      });

    } catch (error) {
      console.error('Update class error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update class'
      });
    }
  }

  // Delete class
  static async deleteClass(req, res) {
    try {
      const { classId } = req.params;

      const deletedClass = await AdminClass.deleteClass(classId);

      if (!deletedClass) {
        return res.status(404).json({
          success: false,
          message: 'Class not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Class deleted successfully'
      });

    } catch (error) {
      console.error('Delete class error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete class'
      });
    }
  }

  // Get class statistics
  static async getClassStats(req, res) {
    try {
      const stats = await AdminClass.getClassStats();

      res.status(200).json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Get class stats error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch class statistics'
      });
    }
  }
}

module.exports = ClassesController;