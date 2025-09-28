const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  exportToCSV,
  exportToExcel,
  exportToPDF
} = require('../controllers/exportController');

// All routes require authentication
router.use(authenticateToken);

// Export routes
router.get('/csv', exportToCSV);
router.get('/excel', exportToExcel);
router.get('/pdf', exportToPDF);

module.exports = router;
