const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Reminder = sequelize.define('Reminder', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  type: {
    type: DataTypes.ENUM('income', 'expense', 'general', 'monthly_summary'),
    allowNull: false,
    validate: {
      isIn: [['income', 'expense', 'general', 'monthly_summary']]
    }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [1, 100],
      notEmpty: true
    }
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [1, 500],
      notEmpty: true
    }
  },
  frequency: {
    type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'custom'),
    allowNull: false,
    defaultValue: 'weekly',
    validate: {
      isIn: [['daily', 'weekly', 'monthly', 'custom']]
    }
  },
  dayOfWeek: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0,
      max: 6 // 0 = Sunday, 6 = Saturday
    }
  },
  dayOfMonth: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 31
    }
  },
  time: {
    type: DataTypes.TIME,
    allowNull: false,
    defaultValue: '09:00:00'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  lastSent: {
    type: DataTypes.DATE,
    allowNull: true
  },
  nextSend: {
    type: DataTypes.DATE,
    allowNull: true
  },
  customCron: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Custom cron expression for advanced scheduling'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['userId', 'isActive']
    },
    {
      fields: ['nextSend']
    },
    {
      fields: ['type']
    }
  ]
});

module.exports = Reminder;
