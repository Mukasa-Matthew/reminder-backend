const nodemailer = require('nodemailer');
require('dotenv').config();

// Create email transporter
const createTransporter = () => {
  // For development, you can use Gmail or other SMTP services
  // For production, consider using services like SendGrid, Mailgun, or AWS SES
  
  if (process.env.NODE_ENV === 'development') {
    // Gmail configuration (for development)
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD // Use App Password for Gmail
      }
    });
  } else {
    // Production SMTP configuration
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
  }
};

const transporter = createTransporter();

// Email templates
const emailTemplates = {
  reminder: {
    subject: (title) => `💰 Finance Tracker Reminder: ${title}`,
    html: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Finance Tracker Reminder</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          .highlight { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💰 Finance Tracker</h1>
            <p>Your Personal Finance Assistant</p>
          </div>
          <div class="content">
            <h2>${data.title}</h2>
            <p>${data.message}</p>
            
            <div class="highlight">
              <strong>Quick Actions:</strong>
              <ul>
                <li><a href="${data.appUrl}/api" style="color: #667eea;">View API Documentation</a></li>
                <li><a href="${data.appUrl}/health" style="color: #667eea;">Check API Status</a></li>
                <li><a href="${data.appUrl}/api/reminder-templates" style="color: #667eea;">View Reminder Templates</a></li>
              </ul>
            </div>
            
            <p>Stay on top of your finances by regularly recording your transactions. This helps you:</p>
            <ul>
              <li>Track your spending patterns</li>
              <li>Identify areas for savings</li>
              <li>Plan your budget effectively</li>
              <li>Achieve your financial goals</li>
            </ul>
            
            <a href="${data.appUrl}/api" class="button">Open Finance Tracker API</a>
          </div>
          <div class="footer">
            <p>This is an automated reminder from your Finance Tracker app.</p>
            <p>You can manage your reminders in the app settings.</p>
          </div>
        </div>
      </body>
      </html>
    `
  },
  
  monthlySummary: {
    subject: (month, year) => `📊 Monthly Finance Summary - ${month} ${year}`,
    html: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Monthly Finance Summary</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .stats { display: flex; justify-content: space-around; margin: 20px 0; }
          .stat { text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .stat-value { font-size: 24px; font-weight: bold; color: #28a745; }
          .stat-label { color: #666; font-size: 14px; }
          .button { display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Monthly Summary</h1>
            <p>${data.month} ${data.year}</p>
          </div>
          <div class="content">
            <div class="stats">
              <div class="stat">
                <div class="stat-value">$${data.income.toFixed(2)}</div>
                <div class="stat-label">Total Income</div>
              </div>
              <div class="stat">
                <div class="stat-value">$${data.expenses.toFixed(2)}</div>
                <div class="stat-label">Total Expenses</div>
              </div>
              <div class="stat">
                <div class="stat-value">$${data.net.toFixed(2)}</div>
                <div class="stat-label">Net Amount</div>
              </div>
            </div>
            
            <h3>Top Categories</h3>
            <ul>
              ${data.topCategories.map(cat => `<li><strong>${cat.name}:</strong> $${cat.total.toFixed(2)}</li>`).join('')}
            </ul>
            
            <p>Great job tracking your finances this month! Keep up the good work.</p>
            
            <a href="${data.appUrl}/analytics/monthly/${data.year}/${data.month}" class="button">View Detailed Report</a>
          </div>
          <div class="footer">
            <p>This is your monthly finance summary from Finance Tracker.</p>
          </div>
        </div>
      </body>
      </html>
    `
  },
  
  notification: {
    subject: (title) => `🔔 Finance Tracker: ${title}`,
    html: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Finance Tracker Notification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #17a2b8 0%, #138496 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #17a2b8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 Finance Tracker</h1>
            <p>New Notification</p>
          </div>
          <div class="content">
            <h2>${data.title}</h2>
            <p>${data.message}</p>
            
            ${data.actionUrl ? `<a href="${data.actionUrl}" class="button">Take Action</a>` : ''}
          </div>
          <div class="footer">
            <p>This notification was sent from your Finance Tracker app.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }
};

// Send email function
const sendEmail = async (to, template, data) => {
  try {
    const templateData = emailTemplates[template];
    if (!templateData) {
      throw new Error(`Email template '${template}' not found`);
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: to,
      subject: templateData.subject(data.title || data.month || 'Notification'),
      html: templateData.html(data)
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${to}:`, result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw error;
  }
};

// Test email connection
const testEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log('✅ Email server connection verified');
    return true;
  } catch (error) {
    console.error('❌ Email server connection failed:', error);
    return false;
  }
};

module.exports = {
  sendEmail,
  testEmailConnection,
  emailTemplates
};
