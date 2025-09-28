const cron = require('node-cron');
const { Reminder, User, Transaction, Category } = require('../models');
const { sendEmail } = require('../config/email');
const { Op } = require('sequelize');

class ReminderScheduler {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  // Start the reminder scheduler
  start() {
    if (this.isRunning) {
      console.log('Reminder scheduler is already running');
      return;
    }

    console.log('🕐 Starting reminder scheduler...');
    this.isRunning = true;

    // Schedule daily check for reminders
    this.scheduleDailyCheck();
    
    // Load and schedule existing reminders
    this.loadAndScheduleReminders();

    console.log('✅ Reminder scheduler started successfully');
  }

  // Stop the reminder scheduler
  stop() {
    console.log('🛑 Stopping reminder scheduler...');
    this.isRunning = false;
    
    // Stop all cron jobs
    this.jobs.forEach((job, reminderId) => {
      job.destroy();
      console.log(`Stopped reminder job: ${reminderId}`);
    });
    
    this.jobs.clear();
    console.log('✅ Reminder scheduler stopped');
  }

  // Schedule daily check for reminders
  scheduleDailyCheck() {
    // Run every day at 8:00 AM
    const dailyJob = cron.schedule('0 8 * * *', async () => {
      console.log('🔄 Running daily reminder check...');
      await this.processDueReminders();
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    this.jobs.set('daily_check', dailyJob);
  }

  // Load and schedule existing reminders
  async loadAndScheduleReminders() {
    try {
      const reminders = await Reminder.findAll({
        where: { isActive: true },
        include: [{ model: User, as: 'user' }]
      });

      for (const reminder of reminders) {
        this.scheduleReminder(reminder);
      }

      console.log(`📅 Loaded ${reminders.length} active reminders`);
    } catch (error) {
      console.error('❌ Error loading reminders:', error);
    }
  }

  // Schedule a specific reminder
  scheduleReminder(reminder) {
    try {
      let cronExpression;

      switch (reminder.frequency) {
        case 'daily':
          cronExpression = this.getDailyCron(reminder.time);
          break;
        case 'weekly':
          cronExpression = this.getWeeklyCron(reminder.dayOfWeek, reminder.time);
          break;
        case 'monthly':
          cronExpression = this.getMonthlyCron(reminder.dayOfMonth, reminder.time);
          break;
        case 'custom':
          cronExpression = reminder.customCron;
          break;
        default:
          console.warn(`Unknown frequency: ${reminder.frequency}`);
          return;
      }

      if (!cronExpression) {
        console.warn(`Invalid cron expression for reminder ${reminder.id}`);
        return;
      }

      const job = cron.schedule(cronExpression, async () => {
        await this.sendReminder(reminder);
      }, {
        scheduled: true,
        timezone: 'UTC'
      });

      this.jobs.set(reminder.id, job);
      console.log(`📅 Scheduled reminder: ${reminder.title} (${reminder.frequency})`);
    } catch (error) {
      console.error(`❌ Error scheduling reminder ${reminder.id}:`, error);
    }
  }

  // Get daily cron expression
  getDailyCron(time) {
    const [hours, minutes] = time.split(':');
    return `${minutes} ${hours} * * *`;
  }

  // Get weekly cron expression
  getWeeklyCron(dayOfWeek, time) {
    const [hours, minutes] = time.split(':');
    return `${minutes} ${hours} * * ${dayOfWeek}`;
  }

  // Get monthly cron expression
  getMonthlyCron(dayOfMonth, time) {
    const [hours, minutes] = time.split(':');
    return `${minutes} ${hours} ${dayOfMonth} * *`;
  }

  // Process due reminders
  async processDueReminders() {
    try {
      const now = new Date();
      const reminders = await Reminder.findAll({
        where: {
          isActive: true,
          nextSend: {
            [Op.lte]: now
          }
        },
        include: [{ model: User, as: 'user' }]
      });

      for (const reminder of reminders) {
        await this.sendReminder(reminder);
        await this.updateNextSend(reminder);
      }

      console.log(`📧 Processed ${reminders.length} due reminders`);
    } catch (error) {
      console.error('❌ Error processing due reminders:', error);
    }
  }

  // Send a reminder
  async sendReminder(reminder) {
    try {
      const user = reminder.user;
      
      // Prepare email data
      const emailData = {
        title: reminder.title,
        message: reminder.message,
        appUrl: process.env.APP_URL || 'http://localhost:3000'
      };

      // Send email
      await sendEmail(user.email, 'reminder', emailData);

      // Create notification
      await this.createNotification(user.id, {
        type: 'reminder',
        title: reminder.title,
        message: reminder.message,
        actionUrl: `${emailData.appUrl}/transactions/new`
      });

      // Update last sent time
      await reminder.update({ lastSent: new Date() });

      console.log(`📧 Sent reminder to ${user.email}: ${reminder.title}`);
    } catch (error) {
      console.error(`❌ Error sending reminder ${reminder.id}:`, error);
    }
  }

  // Update next send time for a reminder
  async updateNextSend(reminder) {
    try {
      const now = new Date();
      let nextSend;

      switch (reminder.frequency) {
        case 'daily':
          nextSend = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          break;
        case 'weekly':
          nextSend = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly':
          nextSend = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
          break;
        default:
          return;
      }

      await reminder.update({ nextSend });
    } catch (error) {
      console.error(`❌ Error updating next send time for reminder ${reminder.id}:`, error);
    }
  }

  // Create notification
  async createNotification(userId, notificationData) {
    try {
      const { Notification } = require('../models');
      await Notification.create({
        ...notificationData,
        userId
      });
    } catch (error) {
      console.error('❌ Error creating notification:', error);
    }
  }

  // Add new reminder
  async addReminder(reminder) {
    this.scheduleReminder(reminder);
  }

  // Remove reminder
  removeReminder(reminderId) {
    const job = this.jobs.get(reminderId);
    if (job) {
      job.destroy();
      this.jobs.delete(reminderId);
      console.log(`🗑️ Removed reminder job: ${reminderId}`);
    }
  }

  // Update reminder
  async updateReminder(reminder) {
    this.removeReminder(reminder.id);
    if (reminder.isActive) {
      this.scheduleReminder(reminder);
    }
  }

  // Send monthly summary
  async sendMonthlySummary(userId, year, month) {
    try {
      const user = await User.findByPk(userId);
      if (!user) return;

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      // Get monthly transactions
      const transactions = await Transaction.findAll({
        where: {
          userId,
          date: {
            [Op.between]: [startDate, endDate]
          }
        },
        include: [{ model: Category, as: 'category' }]
      });

      // Calculate totals
      const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      const expenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      // Get top categories
      const categoryTotals = {};
      transactions.forEach(t => {
        const catName = t.category.name;
        categoryTotals[catName] = (categoryTotals[catName] || 0) + parseFloat(t.amount);
      });

      const topCategories = Object.entries(categoryTotals)
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];

      const emailData = {
        month: monthNames[month - 1],
        year,
        income,
        expenses,
        net: income - expenses,
        topCategories,
        appUrl: process.env.APP_URL || 'http://localhost:3000'
      };

      await sendEmail(user.email, 'monthlySummary', emailData);

      // Create notification
      await this.createNotification(userId, {
        type: 'system',
        title: 'Monthly Summary Sent',
        message: `Your ${emailData.month} ${year} finance summary has been sent to your email.`,
        actionUrl: `${emailData.appUrl}/analytics/monthly/${year}/${month}`
      });

      console.log(`📊 Sent monthly summary to ${user.email}`);
    } catch (error) {
      console.error('❌ Error sending monthly summary:', error);
    }
  }
}

// Create singleton instance
const reminderScheduler = new ReminderScheduler();

module.exports = reminderScheduler;
