const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getTemplates,
  getTemplateById,
  createReminderFromTemplate,
  getTemplateCategories
} = require('../controllers/reminderTemplateController');

// All routes require authentication
router.use(authenticateToken);

// Template routes
router.get('/', getTemplates);
router.get('/categories', getTemplateCategories);
router.get('/:id', getTemplateById);
router.post('/:templateId/create-reminder', createReminderFromTemplate);

module.exports = router;
