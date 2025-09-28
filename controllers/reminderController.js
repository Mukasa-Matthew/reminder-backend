const { Reminder, User, Notification } = require('../models');
const { Op } = require('sequelize');
const reminderScheduler = require('../utils/reminderScheduler');

const createReminder = async (req, res) => {
  try {
    const {
      type,
      title,
      message,
      frequency,
      dayOfWeek,
      dayOfMonth,
      time,
      customCron
    } = req.body;
    const userId = req.user.id;

    // Validate frequency-specific fields
    if (frequency === 'weekly' && (dayOfWeek === undefined || dayOfWeek < 0 || dayOfWeek > 6)) {
      return res.status(400).json({
        success: false,
        message: 'dayOfWeek is required for weekly reminders (0-6, where 0 is Sunday)'
      });
    }

    if (frequency === 'monthly' && (dayOfMonth === undefined || dayOfMonth < 1 || dayOfMonth > 31)) {
      return res.status(400).json({
        success: false,
        message: 'dayOfMonth is required for monthly reminders (1-31)'
      });
    }

    if (frequency === 'custom' && !customCron) {
      return res.status(400).json({
        success: false,
        message: 'customCron is required for custom frequency reminders'
      });
    }

    // Calculate next send time
    const nextSend = calculateNextSendTime(frequency, dayOfWeek, dayOfMonth, time, customCron);

    const reminder = await Reminder.create({
      type,
      title,
      message,
      frequency,
      dayOfWeek,
      dayOfMonth,
      time,
      customCron,
      nextSend,
      userId
    });

    // Schedule the reminder
    await reminderScheduler.addReminder(reminder);

    res.status(201).json({
      success: true,
      message: 'Reminder created successfully',
      data: { reminder }
    });
  } catch (error) {
    console.error('Create reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create reminder',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const getReminders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, isActive } = req.query;

    const whereClause = { userId };
    if (type) whereClause.type = type;
    if (isActive !== undefined) whereClause.isActive = isActive === 'true';

    const reminders = await Reminder.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: { reminders }
    });
  } catch (error) {
    console.error('Get reminders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get reminders',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const getReminderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const reminder = await Reminder.findOne({
      where: { id, userId }
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    res.json({
      success: true,
      data: { reminder }
    });
  } catch (error) {
    console.error('Get reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get reminder',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const updateReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      type,
      title,
      message,
      frequency,
      dayOfWeek,
      dayOfMonth,
      time,
      customCron,
      isActive
    } = req.body;

    const reminder = await Reminder.findOne({
      where: { id, userId }
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    // Validate frequency-specific fields
    if (frequency === 'weekly' && (dayOfWeek === undefined || dayOfWeek < 0 || dayOfWeek > 6)) {
      return res.status(400).json({
        success: false,
        message: 'dayOfWeek is required for weekly reminders (0-6, where 0 is Sunday)'
      });
    }

    if (frequency === 'monthly' && (dayOfMonth === undefined || dayOfMonth < 1 || dayOfMonth > 31)) {
      return res.status(400).json({
        success: false,
        message: 'dayOfMonth is required for monthly reminders (1-31)'
      });
    }

    if (frequency === 'custom' && !customCron) {
      return res.status(400).json({
        success: false,
        message: 'customCron is required for custom frequency reminders'
      });
    }

    // Calculate next send time if frequency or time changed
    let nextSend = reminder.nextSend;
    if (frequency !== reminder.frequency || time !== reminder.time || 
        dayOfWeek !== reminder.dayOfWeek || dayOfMonth !== reminder.dayOfMonth) {
      nextSend = calculateNextSendTime(frequency || reminder.frequency, 
        dayOfWeek !== undefined ? dayOfWeek : reminder.dayOfWeek,
        dayOfMonth !== undefined ? dayOfMonth : reminder.dayOfMonth,
        time || reminder.time, 
        customCron || reminder.customCron);
    }

    await reminder.update({
      type: type || reminder.type,
      title: title || reminder.title,
      message: message || reminder.message,
      frequency: frequency || reminder.frequency,
      dayOfWeek: dayOfWeek !== undefined ? dayOfWeek : reminder.dayOfWeek,
      dayOfMonth: dayOfMonth !== undefined ? dayOfMonth : reminder.dayOfMonth,
      time: time || reminder.time,
      customCron: customCron || reminder.customCron,
      isActive: isActive !== undefined ? isActive : reminder.isActive,
      nextSend
    });

    // Update scheduler
    await reminderScheduler.updateReminder(reminder);

    res.json({
      success: true,
      message: 'Reminder updated successfully',
      data: { reminder }
    });
  } catch (error) {
    console.error('Update reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update reminder',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const deleteReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const reminder = await Reminder.findOne({
      where: { id, userId }
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    // Remove from scheduler
    reminderScheduler.removeReminder(reminder.id);

    await reminder.destroy();

    res.json({
      success: true,
      message: 'Reminder deleted successfully'
    });
  } catch (error) {
    console.error('Delete reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete reminder',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const sendTestReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const reminder = await Reminder.findOne({
      where: { id, userId },
      include: [{ model: User, as: 'user' }]
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    // Send test reminder
    await reminderScheduler.sendReminder(reminder);

    res.json({
      success: true,
      message: 'Test reminder sent successfully'
    });
  } catch (error) {
    console.error('Send test reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test reminder',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const sendMonthlySummary = async (req, res) => {
  try {
    const { year, month } = req.params;
    const userId = req.user.id;

    await reminderScheduler.sendMonthlySummary(userId, parseInt(year), parseInt(month));

    res.json({
      success: true,
      message: 'Monthly summary sent successfully'
    });
  } catch (error) {
    console.error('Send monthly summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send monthly summary',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Helper function to calculate next send time
const calculateNextSendTime = (frequency, dayOfWeek, dayOfMonth, time, customCron) => {
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

    case 'custom':
      // For custom cron, we'll set it to now + 1 hour as a fallback
      // The actual scheduling will be handled by the cron expression
      return new Date(now.getTime() + 60 * 60 * 1000);

    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000); // Default to tomorrow
  }
};

module.exports = {
  createReminder,
  getReminders,
  getReminderById,
  updateReminder,
  deleteReminder,
  sendTestReminder,
  sendMonthlySummary
};
