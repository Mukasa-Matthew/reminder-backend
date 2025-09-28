const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { testConnection } = require('./config/database');
const { syncDatabase } = require('./models');
const reminderScheduler = require('./utils/reminderScheduler');
const { testEmailConnection } = require('./config/email');

// Import routes
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const categoryRoutes = require('./routes/categories');
const analyticsRoutes = require('./routes/analytics');
const exportRoutes = require('./routes/export');
const reminderRoutes = require('./routes/reminders');
const notificationRoutes = require('./routes/notifications');
const reminderTemplateRoutes = require('./routes/reminderTemplates');

const app = express();
const PORT = process.env.PORT || 5000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined'));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Finance Tracker API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reminder-templates', reminderTemplateRoutes);

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Finance Tracker API Documentation',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/profile'
      },
      transactions: {
        list: 'GET /api/transactions',
        create: 'POST /api/transactions',
        update: 'PUT /api/transactions/:id',
        delete: 'DELETE /api/transactions/:id'
      },
      categories: {
        list: 'GET /api/categories',
        create: 'POST /api/categories',
        update: 'PUT /api/categories/:id',
        delete: 'DELETE /api/categories/:id'
      },
      analytics: {
        dashboard: 'GET /api/analytics/dashboard',
        monthly: 'GET /api/analytics/monthly/:year/:month',
        yearly: 'GET /api/analytics/yearly/:year'
      },
      export: {
        csv: 'GET /api/export/csv',
        excel: 'GET /api/export/excel',
        pdf: 'GET /api/export/pdf'
      },
      reminders: {
        list: 'GET /api/reminders',
        create: 'POST /api/reminders',
        update: 'PUT /api/reminders/:id',
        delete: 'DELETE /api/reminders/:id',
        test: 'POST /api/reminders/:id/test'
      },
      notifications: {
        list: 'GET /api/notifications',
        markRead: 'PUT /api/notifications/:id/read',
        delete: 'DELETE /api/notifications/:id'
      },
      reminderTemplates: {
        list: 'GET /api/reminder-templates',
        categories: 'GET /api/reminder-templates/categories',
        getById: 'GET /api/reminder-templates/:id',
        createReminder: 'POST /api/reminder-templates/:templateId/create-reminder'
      }
    },
    documentation: 'See POSTMAN_TESTING.md for detailed testing guide'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Initialize database and start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();
    
    // Test email connection
    await testEmailConnection();
    
    // Sync database models
    await syncDatabase();
    
    // Start reminder scheduler
    reminderScheduler.start();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Finance Tracker API server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
      console.log(`📧 Email reminders: Active`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  reminderScheduler.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  reminderScheduler.stop();
  process.exit(0);
});

startServer();
