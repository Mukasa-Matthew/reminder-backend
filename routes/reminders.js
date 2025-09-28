const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const {
  createReminder,
  getReminders,
  getReminderById,
  updateReminder,
  deleteReminder,
  sendTestReminder,
  sendMonthlySummary
} = require('../controllers/reminderController');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Reminder validation rules
const validateReminder = [
  body('type')
    .isIn(['income', 'expense', 'general', 'monthly_summary'])
    .withMessage('Type must be one of: income, expense, general, monthly_summary'),
  
  body('title')
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters')
    .trim(),
  
  body('message')
    .isLength({ min: 1, max: 500 })
    .withMessage('Message must be between 1 and 500 characters')
    .trim(),
  
  body('frequency')
    .isIn(['daily', 'weekly', 'monthly', 'custom'])
    .withMessage('Frequency must be one of: daily, weekly, monthly, custom'),
  
  body('time')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time must be in HH:MM format'),
  
  body('dayOfWeek')
    .optional()
    .isInt({ min: 0, max: 6 })
    .withMessage('dayOfWeek must be between 0 (Sunday) and 6 (Saturday)'),
  
  body('dayOfMonth')
    .optional()
    .isInt({ min: 1, max: 31 })
    .withMessage('dayOfMonth must be between 1 and 31'),
  
  body('customCron')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Custom cron expression must be between 1 and 100 characters'),
  
  handleValidationErrors
];

// All routes require authentication
router.use(authenticateToken);

// Reminder routes
router.post('/', validateReminder, createReminder);
router.get('/', getReminders);
router.get('/:id', getReminderById);
router.put('/:id', validateReminder, updateReminder);
router.delete('/:id', deleteReminder);
router.post('/:id/test', sendTestReminder);
router.post('/monthly-summary/:year/:month', sendMonthlySummary);

module.exports = router;
