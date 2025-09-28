const { Transaction, Category } = require('../models');
const { Op } = require('sequelize');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const path = require('path');

const exportToCSV = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, type, categoryId } = req.query;

    const whereClause = { userId };

    // Add filters
    if (type) whereClause.type = type;
    if (categoryId) whereClause.categoryId = categoryId;
    
    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date[Op.gte] = startDate;
      if (endDate) whereClause.date[Op.lte] = endDate;
    }

    const transactions = await Transaction.findAll({
      where: whereClause,
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['name']
        }
      ],
      order: [['date', 'DESC']]
    });

    // Prepare CSV data
    const csvData = transactions.map(transaction => ({
      Date: transaction.date,
      Type: transaction.type,
      Amount: transaction.amount,
      Description: transaction.description,
      Category: transaction.category.name,
      Notes: transaction.notes || '',
      Tags: transaction.tags.join(', '),
      Created: transaction.createdAt
    }));

    // Create CSV file
    const fileName = `transactions_${Date.now()}.csv`;
    const filePath = path.join(__dirname, '../../temp', fileName);

    // Ensure temp directory exists
    const tempDir = path.dirname(filePath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const csvWriter = createCsvWriter({
      path: filePath,
      header: [
        { id: 'Date', title: 'Date' },
        { id: 'Type', title: 'Type' },
        { id: 'Amount', title: 'Amount' },
        { id: 'Description', title: 'Description' },
        { id: 'Category', title: 'Category' },
        { id: 'Notes', title: 'Notes' },
        { id: 'Tags', title: 'Tags' },
        { id: 'Created', title: 'Created At' }
      ]
    });

    await csvWriter.writeRecords(csvData);

    // Send file
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('CSV download error:', err);
      }
      // Clean up file after download
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) console.error('File cleanup error:', unlinkErr);
      });
    });
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export CSV',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const exportToExcel = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, type, categoryId } = req.query;

    const whereClause = { userId };

    // Add filters
    if (type) whereClause.type = type;
    if (categoryId) whereClause.categoryId = categoryId;
    
    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date[Op.gte] = startDate;
      if (endDate) whereClause.date[Op.lte] = endDate;
    }

    const transactions = await Transaction.findAll({
      where: whereClause,
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['name']
        }
      ],
      order: [['date', 'DESC']]
    });

    // Prepare Excel data
    const excelData = transactions.map(transaction => ({
      Date: transaction.date,
      Type: transaction.type,
      Amount: parseFloat(transaction.amount),
      Description: transaction.description,
      Category: transaction.category.name,
      Notes: transaction.notes || '',
      Tags: transaction.tags.join(', '),
      Created: transaction.createdAt
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const columnWidths = [
      { wch: 12 }, // Date
      { wch: 10 }, // Type
      { wch: 12 }, // Amount
      { wch: 30 }, // Description
      { wch: 20 }, // Category
      { wch: 40 }, // Notes
      { wch: 20 }, // Tags
      { wch: 20 }  // Created
    ];
    worksheet['!cols'] = columnWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');

    // Generate Excel file
    const fileName = `transactions_${Date.now()}.xlsx`;
    const filePath = path.join(__dirname, '../../temp', fileName);

    // Ensure temp directory exists
    const tempDir = path.dirname(filePath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    XLSX.writeFile(workbook, filePath);

    // Send file
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('Excel download error:', err);
      }
      // Clean up file after download
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) console.error('File cleanup error:', unlinkErr);
      });
    });
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export Excel',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const exportToPDF = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, type, categoryId } = req.query;

    const whereClause = { userId };

    // Add filters
    if (type) whereClause.type = type;
    if (categoryId) whereClause.categoryId = categoryId;
    
    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date[Op.gte] = startDate;
      if (endDate) whereClause.date[Op.lte] = endDate;
    }

    const transactions = await Transaction.findAll({
      where: whereClause,
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['name']
        }
      ],
      order: [['date', 'DESC']]
    });

    // Create PDF
    const fileName = `transactions_${Date.now()}.pdf`;
    const filePath = path.join(__dirname, '../../temp', fileName);

    // Ensure temp directory exists
    const tempDir = path.dirname(filePath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(filePath));

    // PDF Header
    doc.fontSize(20).text('Transaction Report', 50, 50);
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, 50, 80);
    doc.fontSize(12).text(`Total Transactions: ${transactions.length}`, 50, 100);

    // Calculate totals
    const incomeTotal = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const expenseTotal = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    doc.text(`Total Income: $${incomeTotal.toFixed(2)}`, 50, 120);
    doc.text(`Total Expenses: $${expenseTotal.toFixed(2)}`, 50, 140);
    doc.text(`Net: $${(incomeTotal - expenseTotal).toFixed(2)}`, 50, 160);

    // Table header
    let yPosition = 200;
    doc.fontSize(10);
    doc.text('Date', 50, yPosition);
    doc.text('Type', 120, yPosition);
    doc.text('Amount', 180, yPosition);
    doc.text('Description', 250, yPosition);
    doc.text('Category', 400, yPosition);

    // Draw line under header
    doc.moveTo(50, yPosition + 15).lineTo(550, yPosition + 15).stroke();
    yPosition += 25;

    // Add transactions
    transactions.forEach((transaction, index) => {
      if (yPosition > 750) { // New page if needed
        doc.addPage();
        yPosition = 50;
      }

      doc.text(transaction.date.toLocaleDateString(), 50, yPosition);
      doc.text(transaction.type, 120, yPosition);
      doc.text(`$${parseFloat(transaction.amount).toFixed(2)}`, 180, yPosition);
      doc.text(transaction.description.substring(0, 30), 250, yPosition);
      doc.text(transaction.category.name, 400, yPosition);

      yPosition += 20;
    });

    doc.end();

    // Wait for PDF to be written, then send
    setTimeout(() => {
      res.download(filePath, fileName, (err) => {
        if (err) {
          console.error('PDF download error:', err);
        }
        // Clean up file after download
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) console.error('File cleanup error:', unlinkErr);
        });
      });
    }, 1000);
  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export PDF',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  exportToCSV,
  exportToExcel,
  exportToPDF
};
