const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ReminderTemplate = sequelize.define('ReminderTemplate', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [1, 100],
      notEmpty: true
    }
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
    validate: {
      isIn: [['daily', 'weekly', 'monthly', 'custom']]
    }
  },
  dayOfWeek: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0,
      max: 6
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
  isDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Template category for organization'
  }
}, {
  timestamps: true
});

module.exports = ReminderTemplate;
