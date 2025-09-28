const { Transaction, Category } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'month' } = req.query; // month, year, all

    let dateFilter = {};
    const now = new Date();

    if (period === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = { [Op.gte]: startOfMonth };
    } else if (period === 'year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      dateFilter = { [Op.gte]: startOfYear };
    }

    const whereClause = {
      userId,
      ...(Object.keys(dateFilter).length > 0 && { date: dateFilter })
    };

    // Get total income and expenses
    const totals = await Transaction.findAll({
      where: whereClause,
      attributes: [
        'type',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['type'],
      raw: true
    });

    // Get category breakdown
    const categoryBreakdown = await Transaction.findAll({
      where: whereClause,
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'color', 'icon']
        }
      ],
      attributes: [
        'categoryId',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
        [sequelize.fn('COUNT', sequelize.col('Transaction.id')), 'count']
      ],
      group: ['categoryId', 'category.id', 'category.name', 'category.color', 'category.icon'],
      order: [[sequelize.fn('SUM', sequelize.col('amount')), 'DESC']],
      raw: false
    });

    // Get monthly trends (last 12 months)
    const monthlyTrends = await Transaction.findAll({
      where: {
        userId,
        date: {
          [Op.gte]: new Date(now.getFullYear() - 1, now.getMonth(), 1)
        }
      },
      attributes: [
        [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('date')), 'month'],
        'type',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      group: [
        sequelize.fn('DATE_TRUNC', 'month', sequelize.col('date')),
        'type'
      ],
      order: [[sequelize.fn('DATE_TRUNC', 'month', sequelize.col('date')), 'ASC']],
      raw: true
    });

    // Get recent transactions
    const recentTransactions = await Transaction.findAll({
      where: { userId },
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'color', 'icon']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    // Calculate net worth
    const incomeTotal = totals.find(t => t.type === 'income')?.total || 0;
    const expenseTotal = totals.find(t => t.type === 'expense')?.total || 0;
    const netWorth = parseFloat(incomeTotal) - parseFloat(expenseTotal);

    res.json({
      success: true,
      data: {
        period,
        totals: {
          income: parseFloat(incomeTotal) || 0,
          expenses: parseFloat(expenseTotal) || 0,
          netWorth,
          incomeCount: totals.find(t => t.type === 'income')?.count || 0,
          expenseCount: totals.find(t => t.type === 'expense')?.count || 0
        },
        categoryBreakdown: categoryBreakdown.map(item => ({
          category: item.category,
          total: parseFloat(item.dataValues.total) || 0,
          count: parseInt(item.dataValues.count) || 0
        })),
        monthlyTrends,
        recentTransactions
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const getMonthlyReport = async (req, res) => {
  try {
    const userId = req.user.id;
    const { year, month } = req.params;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const whereClause = {
      userId,
      date: {
        [Op.between]: [startDate, endDate]
      }
    };

    // Get transactions for the month
    const transactions = await Transaction.findAll({
      where: whereClause,
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'color', 'icon']
        }
      ],
      order: [['date', 'DESC']]
    });

    // Get summary by type
    const summary = await Transaction.findAll({
      where: whereClause,
      attributes: [
        'type',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['type'],
      raw: true
    });

    // Get daily breakdown
    const dailyBreakdown = await Transaction.findAll({
      where: whereClause,
      attributes: [
        [sequelize.fn('DATE', sequelize.col('date')), 'day'],
        'type',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      group: [
        sequelize.fn('DATE', sequelize.col('date')),
        'type'
      ],
      order: [[sequelize.fn('DATE', sequelize.col('date')), 'ASC']],
      raw: true
    });

    // Get category breakdown
    const categoryBreakdown = await Transaction.findAll({
      where: whereClause,
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'color', 'icon']
        }
      ],
      attributes: [
        'categoryId',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
        [sequelize.fn('COUNT', sequelize.col('Transaction.id')), 'count']
      ],
      group: ['categoryId', 'category.id', 'category.name', 'category.color', 'category.icon'],
      order: [[sequelize.fn('SUM', sequelize.col('amount')), 'DESC']],
      raw: false
    });

    const incomeTotal = summary.find(s => s.type === 'income')?.total || 0;
    const expenseTotal = summary.find(s => s.type === 'expense')?.total || 0;

    res.json({
      success: true,
      data: {
        period: { year: parseInt(year), month: parseInt(month) },
        summary: {
          income: parseFloat(incomeTotal) || 0,
          expenses: parseFloat(expenseTotal) || 0,
          net: parseFloat(incomeTotal) - parseFloat(expenseTotal),
          incomeCount: summary.find(s => s.type === 'income')?.count || 0,
          expenseCount: summary.find(s => s.type === 'expense')?.count || 0
        },
        transactions,
        dailyBreakdown,
        categoryBreakdown: categoryBreakdown.map(item => ({
          category: item.category,
          total: parseFloat(item.dataValues.total) || 0,
          count: parseInt(item.dataValues.count) || 0
        }))
      }
    });
  } catch (error) {
    console.error('Get monthly report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get monthly report',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const getYearlyReport = async (req, res) => {
  try {
    const userId = req.user.id;
    const { year } = req.params;

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    const whereClause = {
      userId,
      date: {
        [Op.between]: [startDate, endDate]
      }
    };

    // Get monthly breakdown
    const monthlyBreakdown = await Transaction.findAll({
      where: whereClause,
      attributes: [
        [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('date')), 'month'],
        'type',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: [
        sequelize.fn('DATE_TRUNC', 'month', sequelize.col('date')),
        'type'
      ],
      order: [[sequelize.fn('DATE_TRUNC', 'month', sequelize.col('date')), 'ASC']],
      raw: true
    });

    // Get yearly summary
    const yearlySummary = await Transaction.findAll({
      where: whereClause,
      attributes: [
        'type',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['type'],
      raw: true
    });

    // Get top categories
    const topCategories = await Transaction.findAll({
      where: whereClause,
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'color', 'icon']
        }
      ],
      attributes: [
        'categoryId',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
        [sequelize.fn('COUNT', sequelize.col('Transaction.id')), 'count']
      ],
      group: ['categoryId', 'category.id', 'category.name', 'category.color', 'category.icon'],
      order: [[sequelize.fn('SUM', sequelize.col('amount')), 'DESC']],
      limit: 10,
      raw: false
    });

    const incomeTotal = yearlySummary.find(s => s.type === 'income')?.total || 0;
    const expenseTotal = yearlySummary.find(s => s.type === 'expense')?.total || 0;

    res.json({
      success: true,
      data: {
        year: parseInt(year),
        summary: {
          income: parseFloat(incomeTotal) || 0,
          expenses: parseFloat(expenseTotal) || 0,
          net: parseFloat(incomeTotal) - parseFloat(expenseTotal),
          incomeCount: yearlySummary.find(s => s.type === 'income')?.count || 0,
          expenseCount: yearlySummary.find(s => s.type === 'expense')?.count || 0
        },
        monthlyBreakdown,
        topCategories: topCategories.map(item => ({
          category: item.category,
          total: parseFloat(item.dataValues.total) || 0,
          count: parseInt(item.dataValues.count) || 0
        }))
      }
    });
  } catch (error) {
    console.error('Get yearly report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get yearly report',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  getDashboardStats,
  getMonthlyReport,
  getYearlyReport
};
