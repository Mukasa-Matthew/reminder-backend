const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getDashboardStats,
  getMonthlyReport,
  getYearlyReport
} = require('../controllers/analyticsController');

// All routes require authentication
router.use(authenticateToken);

// Analytics routes
router.get('/dashboard', getDashboardStats);
router.get('/monthly/:year/:month', getMonthlyReport);
router.get('/yearly/:year', getYearlyReport);

module.exports = router;
