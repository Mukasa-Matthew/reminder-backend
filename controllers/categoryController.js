const { Category, Transaction } = require('../models');
const { Op } = require('sequelize');

const getCategories = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type } = req.query;

    const whereClause = {
      [Op.or]: [
        { userId: userId },
        { isDefault: true, userId: null }
      ]
    };

    if (type) {
      whereClause.type = type;
    }

    const categories = await Category.findAll({
      where: whereClause,
      order: [['isDefault', 'DESC'], ['name', 'ASC']]
    });

    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get categories',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, description, type, color, icon } = req.body;
    const userId = req.user.id;

    // Check if category name already exists for this user
    const existingCategory = await Category.findOne({
      where: {
        name,
        type,
        userId
      }
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists for this type'
      });
    }

    const category = await Category.create({
      name,
      description,
      type,
      color: color || '#3B82F6',
      icon: icon || 'category',
      userId
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { category }
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create category',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { name, description, color, icon } = req.body;

    const category = await Category.findOne({
      where: { id, userId }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found or access denied'
      });
    }

    // Check if category name is being changed and if it already exists
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({
        where: {
          name,
          type: category.type,
          userId,
          id: { [Op.ne]: id }
        }
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists for this type'
        });
      }
    }

    await category.update({
      name: name || category.name,
      description: description !== undefined ? description : category.description,
      color: color || category.color,
      icon: icon || category.icon
    });

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: { category }
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update category',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const category = await Category.findOne({
      where: { id, userId }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found or access denied'
      });
    }

    // Check if category is being used by any transactions
    const transactionCount = await Transaction.count({
      where: { categoryId: id }
    });

    if (transactionCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. It is being used by ${transactionCount} transaction(s). Please reassign or delete those transactions first.`
      });
    }

    await category.destroy();

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete category',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const getCategoryStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const { categoryId } = req.params;
    const { startDate, endDate } = req.query;

    // Verify category exists and is accessible
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
      return res.status(404).json({
        success: false,
        message: 'Category not found or access denied'
      });
    }

    const whereClause = {
      userId,
      categoryId
    };

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date[Op.gte] = startDate;
      if (endDate) whereClause.date[Op.lte] = endDate;
    }

    const stats = await Transaction.findAll({
      where: whereClause,
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'transactionCount'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount'],
        [sequelize.fn('AVG', sequelize.col('amount')), 'averageAmount'],
        [sequelize.fn('MIN', sequelize.col('amount')), 'minAmount'],
        [sequelize.fn('MAX', sequelize.col('amount')), 'maxAmount']
      ],
      raw: true
    });

    const monthlyStats = await Transaction.findAll({
      where: whereClause,
      attributes: [
        [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('date')), 'month'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      group: [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('date'))],
      order: [[sequelize.fn('DATE_TRUNC', 'month', sequelize.col('date')), 'ASC']],
      raw: true
    });

    res.json({
      success: true,
      data: {
        category,
        stats: stats[0] || {},
        monthlyStats
      }
    });
  } catch (error) {
    console.error('Get category stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get category statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryStats
};
