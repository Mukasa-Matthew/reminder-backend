const { Transaction, Category, User } = require('../models');
const { Op } = require('sequelize');

const createTransaction = async (req, res) => {
  try {
    const { amount, description, type, date, notes, tags, categoryId } = req.body;
    const userId = req.user.id;

    // Verify category exists and belongs to user or is default
    const category = await Category.findOne({
      where: {
        id: categoryId,
        [Op.or]: [
          { userId: userId },
          { isDefault: true, userId: null }
        ]
      }
    });

    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category not found or access denied'
      });
    }

    // Verify category type matches transaction type
    if (category.type !== type) {
      return res.status(400).json({
        success: false,
        message: 'Category type does not match transaction type'
      });
    }

    const transaction = await Transaction.create({
      amount,
      description,
      type,
      date: date || new Date(),
      notes,
      tags: tags || [],
      userId,
      categoryId
    });

    // Include category and user data in response
    const transactionWithDetails = await Transaction.findByPk(transaction.id, {
      include: [
        { model: Category, as: 'category' },
        { model: User, as: 'user', attributes: ['id', 'username', 'firstName', 'lastName'] }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: { transaction: transactionWithDetails }
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create transaction',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      page = 1, 
      limit = 20, 
      type, 
      categoryId, 
      startDate, 
      endDate,
      search,
      sortBy = 'date',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = { userId };

    // Add filters
    if (type) whereClause.type = type;
    if (categoryId) whereClause.categoryId = categoryId;
    
    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date[Op.gte] = startDate;
      if (endDate) whereClause.date[Op.lte] = endDate;
    }

    if (search) {
      whereClause[Op.or] = [
        { description: { [Op.iLike]: `%${search}%` } },
        { notes: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: transactions } = await Transaction.findAndCountAll({
      where: whereClause,
      include: [
        { model: Category, as: 'category' }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transactions',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const transaction = await Transaction.findOne({
      where: { id, userId },
      include: [
        { model: Category, as: 'category' },
        { model: User, as: 'user', attributes: ['id', 'username', 'firstName', 'lastName'] }
      ]
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      data: { transaction }
    });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transaction',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { amount, description, type, date, notes, tags, categoryId } = req.body;

    const transaction = await Transaction.findOne({
      where: { id, userId }
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // If category is being changed, verify it exists and is accessible
    if (categoryId && categoryId !== transaction.categoryId) {
      const category = await Category.findOne({
        where: {
          id: categoryId,
          [Op.or]: [
            { userId: userId },
            { isDefault: true, userId: null }
          ]
        }
      });

      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Category not found or access denied'
        });
      }

      if (category.type !== (type || transaction.type)) {
        return res.status(400).json({
          success: false,
          message: 'Category type does not match transaction type'
        });
      }
    }

    await transaction.update({
      amount: amount || transaction.amount,
      description: description || transaction.description,
      type: type || transaction.type,
      date: date || transaction.date,
      notes: notes !== undefined ? notes : transaction.notes,
      tags: tags || transaction.tags,
      categoryId: categoryId || transaction.categoryId
    });

    // Get updated transaction with relations
    const updatedTransaction = await Transaction.findByPk(transaction.id, {
      include: [
        { model: Category, as: 'category' },
        { model: User, as: 'user', attributes: ['id', 'username', 'firstName', 'lastName'] }
      ]
    });

    res.json({
      success: true,
      message: 'Transaction updated successfully',
      data: { transaction: updatedTransaction }
    });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update transaction',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const transaction = await Transaction.findOne({
      where: { id, userId }
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    await transaction.destroy();

    res.json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete transaction',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction
};
