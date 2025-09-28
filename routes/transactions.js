const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { validateTransaction } = require('../middleware/validation');
const {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction
} = require('../controllers/transactionController');

// All routes require authentication
router.use(authenticateToken);

// Transaction routes
router.post('/', validateTransaction, createTransaction);
router.get('/', getTransactions);
router.get('/:id', getTransactionById);
router.put('/:id', validateTransaction, updateTransaction);
router.delete('/:id', deleteTransaction);

module.exports = router;
