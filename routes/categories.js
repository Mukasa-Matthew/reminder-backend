const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { validateCategory } = require('../middleware/validation');
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryStats
} = require('../controllers/categoryController');

// All routes require authentication
router.use(authenticateToken);

// Category routes
router.get('/', getCategories);
router.post('/', validateCategory, createCategory);
router.put('/:id', validateCategory, updateCategory);
router.delete('/:id', deleteCategory);
router.get('/:categoryId/stats', getCategoryStats);

module.exports = router;
