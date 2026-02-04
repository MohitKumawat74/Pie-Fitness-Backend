const AdminReport = require('../models/AdminReport');

class ReportsController {
  // Wrapper to match route: getUsersReport
  static async getUsersReport(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const report = await AdminReport.getUserActivityReport(startDate, endDate);
      return res.status(200).json({ success: true, data: report });
    } catch (error) {
      console.error('getUsersReport error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to get users report' });
    }
  }

  // Wrapper to match route: getSubscriptionsReport
  static async getSubscriptionsReport(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const report = await AdminReport.getMembershipReport(startDate, endDate);
      return res.status(200).json({ success: true, data: report });
    } catch (error) {
      console.error('getSubscriptionsReport error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to get subscriptions report' });
    }
  }

  // Wrapper to match route: getBookingsReport (maps to user activity / free trial stats)
  static async getBookingsReport(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const report = await AdminReport.getUserActivityReport(startDate, endDate);
      return res.status(200).json({ success: true, data: report });
    } catch (error) {
      console.error('getBookingsReport error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to get bookings report' });
    }
  }

  // Wrapper to match route: getAnalyticsReport
  static async getAnalyticsReport(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const report = await AdminReport.getFinancialSummary(startDate, endDate);
      return res.status(200).json({ success: true, data: report });
    } catch (error) {
      console.error('getAnalyticsReport error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to get analytics report' });
    }
  }

  // Wrapper to match route: exportReport
  static async exportReport(req, res) {
    try {
      const { reportType } = req.params;
      const params = req.query;
      const report = await AdminReport.getCustomReport(reportType, params);
      // For now, return JSON. Export to CSV/XLS can be added here.
      return res.status(200).json({ success: true, data: report });
    } catch (error) {
      console.error('exportReport error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to export report' });
    }
  }

  // Wrapper to match route: getReportSummary
  static async getReportSummary(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const summary = await AdminReport.getFinancialSummary(startDate, endDate);
      return res.status(200).json({ success: true, data: summary });
    } catch (error) {
      console.error('getReportSummary error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to get report summary' });
    }
  }
  // Get membership reports
  static async getMembershipReport(req, res) {
    try {
      const { startDate, endDate, membershipPlan } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required'
        });
      }

      const filters = {};
      if (membershipPlan) filters.membershipPlan = membershipPlan;

      const report = await AdminReport.getMembershipReport(startDate, endDate, filters);

      res.status(200).json({
        success: true,
        data: report
      });

    } catch (error) {
      console.error('Get membership report error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate membership report'
      });
    }
  }

  // Get revenue reports
  static async getRevenueReport(req, res) {
    try {
      const { startDate, endDate, paymentMethod } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required'
        });
      }

      const filters = {};
      if (paymentMethod) filters.paymentMethod = paymentMethod;

      const report = await AdminReport.getRevenueReport(startDate, endDate, filters);

      res.status(200).json({
        success: true,
        data: report
      });

    } catch (error) {
      console.error('Get revenue report error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate revenue report'
      });
    }
  }

  // Get user activity reports
  static async getUserActivityReport(req, res) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required'
        });
      }

      const report = await AdminReport.getUserActivityReport(startDate, endDate);

      res.status(200).json({
        success: true,
        data: report
      });

    } catch (error) {
      console.error('Get user activity report error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate user activity report'
      });
    }
  }

  // Get trainer performance reports
  static async getTrainerPerformanceReport(req, res) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required'
        });
      }

      const report = await AdminReport.getTrainerPerformanceReport(startDate, endDate);

      res.status(200).json({
        success: true,
        data: report
      });

    } catch (error) {
      console.error('Get trainer performance report error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate trainer performance report'
      });
    }
  }

  // Get financial summary
  static async getFinancialSummary(req, res) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required'
        });
      }

      const report = await AdminReport.getFinancialSummary(startDate, endDate);

      res.status(200).json({
        success: true,
        data: report
      });

    } catch (error) {
      console.error('Get financial summary error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate financial summary'
      });
    }
  }

  // Get custom report
  static async getCustomReport(req, res) {
    try {
      const { reportType } = req.params;
      const parameters = req.query;

      const report = await AdminReport.getCustomReport(reportType, parameters);

      res.status(200).json({
        success: true,
        data: report
      });

    } catch (error) {
      console.error('Get custom report error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate custom report'
      });
    }
  }
}

module.exports = ReportsController;