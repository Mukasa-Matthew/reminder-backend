const { ReminderTemplate, Reminder } = require('../models');
const { Op } = require('sequelize');

const getTemplates = async (req, res) => {
  try {
    const { type, category } = req.query;

    const whereClause = { isActive: true };
    if (type) whereClause.type = type;
    if (category) whereClause.category = category;

    const templates = await ReminderTemplate.findAll({
      where: whereClause,
      order: [['category', 'ASC'], ['name', 'ASC']]
    });

    res.json({
      success: true,
      data: { templates }
    });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get reminder templates',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await ReminderTemplate.findOne({
      where: { id, isActive: true }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: { template }
    });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get template',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const createReminderFromTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const userId = req.user.id;

    // Get the template
    const template = await ReminderTemplate.findOne({
      where: { id: templateId, isActive: true }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Calculate next send time
    const nextSend = calculateNextSendTime(
      template.frequency,
      template.dayOfWeek,
      template.dayOfMonth,
      template.time
    );

    // Create reminder from template
    const reminder = await Reminder.create({
      type: template.type,
      title: template.title,
      message: template.message,
      frequency: template.frequency,
      dayOfWeek: template.dayOfWeek,
      dayOfMonth: template.dayOfMonth,
      time: template.time,
      nextSend,
      userId
    });

    res.status(201).json({
      success: true,
      message: 'Reminder created from template successfully',
      data: { reminder }
    });
  } catch (error) {
    console.error('Create reminder from template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create reminder from template',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const getTemplateCategories = async (req, res) => {
  try {
    const categories = await ReminderTemplate.findAll({
      attributes: ['category'],
      where: {
        isActive: true,
        category: { [Op.ne]: null }
      },
      group: ['category'],
      order: [['category', 'ASC']]
    });

    const categoryList = categories.map(item => item.category);

    res.json({
      success: true,
      data: { categories: categoryList }
    });
  } catch (error) {
    console.error('Get template categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get template categories',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Helper function to calculate next send time
const calculateNextSendTime = (frequency, dayOfWeek, dayOfMonth, time) => {
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);

  switch (frequency) {
    case 'daily':
      const dailyNext = new Date(now);
      dailyNext.setHours(hours, minutes, 0, 0);
      if (dailyNext <= now) {
        dailyNext.setDate(dailyNext.getDate() + 1);
      }
      return dailyNext;

    case 'weekly':
      const weeklyNext = new Date(now);
      weeklyNext.setHours(hours, minutes, 0, 0);
      const daysUntilTarget = (dayOfWeek - weeklyNext.getDay() + 7) % 7;
      weeklyNext.setDate(weeklyNext.getDate() + daysUntilTarget);
      if (weeklyNext <= now) {
        weeklyNext.setDate(weeklyNext.getDate() + 7);
      }
      return weeklyNext;

    case 'monthly':
      const monthlyNext = new Date(now.getFullYear(), now.getMonth(), dayOfMonth, hours, minutes, 0, 0);
      if (monthlyNext <= now) {
        monthlyNext.setMonth(monthlyNext.getMonth() + 1);
      }
      return monthlyNext;

    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000); // Default to tomorrow
  }
};

module.exports = {
  getTemplates,
  getTemplateById,
  createReminderFromTemplate,
  getTemplateCategories
};
