const { sequelize } = require('../config/database');
const User = require('./User');
const Category = require('./Category');
const Transaction = require('./Transaction');
const Reminder = require('./Reminder');
const Notification = require('./Notification');
const ReminderTemplate = require('./ReminderTemplate');

// Define associations
User.hasMany(Category, { 
  foreignKey: 'userId', 
  as: 'categories',
  onDelete: 'CASCADE'
});
Category.belongsTo(User, { 
  foreignKey: 'userId', 
  as: 'user'
});

User.hasMany(Transaction, { 
  foreignKey: 'userId', 
  as: 'transactions',
  onDelete: 'CASCADE'
});
Transaction.belongsTo(User, { 
  foreignKey: 'userId', 
  as: 'user'
});

Category.hasMany(Transaction, { 
  foreignKey: 'categoryId', 
  as: 'transactions',
  onDelete: 'RESTRICT'
});
Transaction.belongsTo(Category, { 
  foreignKey: 'categoryId', 
  as: 'category'
});

// Reminder associations
User.hasMany(Reminder, { 
  foreignKey: 'userId', 
  as: 'reminders',
  onDelete: 'CASCADE'
});
Reminder.belongsTo(User, { 
  foreignKey: 'userId', 
  as: 'user'
});

// Notification associations
User.hasMany(Notification, { 
  foreignKey: 'userId', 
  as: 'notifications',
  onDelete: 'CASCADE'
});
Notification.belongsTo(User, { 
  foreignKey: 'userId', 
  as: 'user'
});

// Sync database
const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('✅ Database models synchronized successfully.');
    
    // Create default categories
    await createDefaultCategories();
    
    // Create default reminder templates
    await createDefaultReminderTemplates();
  } catch (error) {
    console.error('❌ Error synchronizing database:', error);
  }
};

// Create default categories
const createDefaultCategories = async () => {
  const defaultCategories = [
    // Income categories
    { name: 'Salary', type: 'income', color: '#10B981', icon: 'work', isDefault: true },
    { name: 'Freelance', type: 'income', color: '#8B5CF6', icon: 'laptop', isDefault: true },
    { name: 'Investment', type: 'income', color: '#F59E0B', icon: 'trending-up', isDefault: true },
    { name: 'Gift', type: 'income', color: '#EC4899', icon: 'gift', isDefault: true },
    { name: 'Other Income', type: 'income', color: '#6B7280', icon: 'plus', isDefault: true },
    
    // Expense categories
    { name: 'Food & Dining', type: 'expense', color: '#EF4444', icon: 'utensils', isDefault: true },
    { name: 'Transportation', type: 'expense', color: '#3B82F6', icon: 'car', isDefault: true },
    { name: 'Housing', type: 'expense', color: '#8B5CF6', icon: 'home', isDefault: true },
    { name: 'Utilities', type: 'expense', color: '#F59E0B', icon: 'zap', isDefault: true },
    { name: 'Healthcare', type: 'expense', color: '#10B981', icon: 'heart', isDefault: true },
    { name: 'Entertainment', type: 'expense', color: '#EC4899', icon: 'film', isDefault: true },
    { name: 'Shopping', type: 'expense', color: '#F97316', icon: 'shopping-bag', isDefault: true },
    { name: 'Education', type: 'expense', color: '#6366F1', icon: 'book', isDefault: true },
    { name: 'Travel', type: 'expense', color: '#06B6D4', icon: 'plane', isDefault: true },
    { name: 'Other Expense', type: 'expense', color: '#6B7280', icon: 'minus', isDefault: true }
  ];

  for (const categoryData of defaultCategories) {
    const [category, created] = await Category.findOrCreate({
      where: { 
        name: categoryData.name, 
        type: categoryData.type,
        isDefault: true,
        userId: null
      },
      defaults: categoryData
    });
    
    if (created) {
      console.log(`✅ Created default category: ${category.name}`);
    }
  }
};

// Create default reminder templates
const createDefaultReminderTemplates = async () => {
  const defaultTemplates = [
    // Income Reminders
    {
      name: 'Weekly Income Check',
      type: 'income',
      title: '💰 Record Your Weekly Income',
      message: 'Time to record any income you received this week! This helps you track your earning patterns and stay on top of your financial goals.',
      frequency: 'weekly',
      dayOfWeek: 0, // Sunday
      time: '10:00:00',
      isDefault: true,
      category: 'Income Tracking',
      description: 'Weekly reminder to record income transactions'
    },
    {
      name: 'Monthly Salary Reminder',
      type: 'income',
      title: '💼 Monthly Salary Recording',
      message: 'Your monthly salary should be recorded! Don\'t forget to add your regular income to track your monthly earnings accurately.',
      frequency: 'monthly',
      dayOfMonth: 1,
      time: '09:00:00',
      isDefault: true,
      category: 'Income Tracking',
      description: 'Monthly reminder for salary recording'
    },
    {
      name: 'Freelance Income Reminder',
      type: 'income',
      title: '💻 Record Freelance Income',
      message: 'Have you completed any freelance work recently? Make sure to record your freelance income to keep your financial records complete.',
      frequency: 'weekly',
      dayOfWeek: 5, // Friday
      time: '17:00:00',
      isDefault: true,
      category: 'Income Tracking',
      description: 'Weekly reminder for freelance income'
    },

    // Expense Reminders
    {
      name: 'Daily Expense Tracking',
      type: 'expense',
      title: '📝 Record Today\'s Expenses',
      message: 'Don\'t forget to record your daily expenses! Tracking every expense helps you stay within budget and identify spending patterns.',
      frequency: 'daily',
      time: '20:00:00',
      isDefault: true,
      category: 'Expense Tracking',
      description: 'Daily reminder to record expenses'
    },
    {
      name: 'Weekly Expense Review',
      type: 'expense',
      title: '📊 Weekly Expense Review',
      message: 'Time for your weekly expense review! Check if you\'ve recorded all expenses and review your spending patterns for the week.',
      frequency: 'weekly',
      dayOfWeek: 6, // Saturday
      time: '14:00:00',
      isDefault: true,
      category: 'Expense Tracking',
      description: 'Weekly expense review reminder'
    },
    {
      name: 'Monthly Budget Check',
      type: 'expense',
      title: '🎯 Monthly Budget Review',
      message: 'It\'s time to review your monthly budget! Check your spending against your budget and make adjustments for the upcoming month.',
      frequency: 'monthly',
      dayOfMonth: 28,
      time: '19:00:00',
      isDefault: true,
      category: 'Budget Management',
      description: 'Monthly budget review reminder'
    },

    // General Reminders
    {
      name: 'Financial Goal Check',
      type: 'general',
      title: '🎯 Review Your Financial Goals',
      message: 'Take a moment to review your financial goals and progress. Are you on track to achieve your targets?',
      frequency: 'monthly',
      dayOfMonth: 15,
      time: '16:00:00',
      isDefault: true,
      category: 'Goal Setting',
      description: 'Monthly financial goals review'
    },
    {
      name: 'Investment Review',
      type: 'general',
      title: '📈 Investment Portfolio Review',
      message: 'Time to review your investment portfolio! Check your investment performance and consider rebalancing if needed.',
      frequency: 'monthly',
      dayOfMonth: 1,
      time: '11:00:00',
      isDefault: true,
      category: 'Investments',
      description: 'Monthly investment review'
    },
    {
      name: 'Emergency Fund Check',
      type: 'general',
      title: '🛡️ Emergency Fund Review',
      message: 'Review your emergency fund status. Ensure you have enough saved for unexpected expenses and financial security.',
      frequency: 'monthly',
      dayOfMonth: 10,
      time: '15:00:00',
      isDefault: true,
      category: 'Emergency Planning',
      description: 'Monthly emergency fund review'
    },

    // Monthly Summary
    {
      name: 'Monthly Finance Summary',
      type: 'monthly_summary',
      title: '📊 Your Monthly Finance Summary',
      message: 'Your monthly finance summary is ready! Review your income, expenses, and financial progress for the month.',
      frequency: 'monthly',
      dayOfMonth: 1,
      time: '08:00:00',
      isDefault: true,
      category: 'Reports',
      description: 'Automated monthly finance summary'
    }
  ];

  for (const templateData of defaultTemplates) {
    const [template, created] = await ReminderTemplate.findOrCreate({
      where: { 
        name: templateData.name,
        isDefault: true
      },
      defaults: templateData
    });
    
    if (created) {
      console.log(`✅ Created default reminder template: ${template.name}`);
    }
  }
};

module.exports = {
  sequelize,
  User,
  Category,
  Transaction,
  Reminder,
  Notification,
  ReminderTemplate,
  syncDatabase
};
