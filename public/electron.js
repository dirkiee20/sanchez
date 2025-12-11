const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const dbConfig = require('../config/database');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');

// Helper functions for export functionality
function getReportTitle(reportType) {
  const titles = {
    'equipment-utilization': 'Equipment Utilization Report',
    'income-summary': 'Income Summary Report',
    'overdue-rentals': 'Overdue Rentals Report',
    'damage-logs': 'Damage Logs Report'
  };
  return titles[reportType] || 'Report';
}

async function generatePDFContent(doc, reportType, reportData) {
  switch (reportType) {
    case 'equipment-utilization':
      await generateEquipmentUtilizationPDF(doc, reportData);
      break;
    case 'income-summary':
      await generateIncomeSummaryPDF(doc, reportData);
      break;
    case 'overdue-rentals':
      await generateOverdueRentalsPDF(doc, reportData);
      break;
    case 'damage-logs':
      await generateDamageLogsPDF(doc, reportData);
      break;
  }
}

async function generateExcelContent(worksheet, reportType, reportData, dateRange) {
  // Add header information
  worksheet.getCell('A1').value = 'Rent and Return System - Report';
  worksheet.getCell('A2').value = getReportTitle(reportType);
  worksheet.getCell('A3').value = dateRange.startDate && dateRange.endDate
    ? `Report Period: ${dateRange.startDate} to ${dateRange.endDate}`
    : 'Report Period: All Time';
  worksheet.getCell('A4').value = `Generated on: ${new Date().toLocaleString()}`;

  // Style headers
  ['A1', 'A2', 'A3', 'A4'].forEach(cell => {
    worksheet.getCell(cell).font = { bold: true, size: 12 };
  });

  let currentRow = 6;

  switch (reportType) {
    case 'equipment-utilization':
      currentRow = await generateEquipmentUtilizationExcel(worksheet, reportData, currentRow);
      break;
    case 'income-summary':
      currentRow = await generateIncomeSummaryExcel(worksheet, reportData, currentRow);
      break;
    case 'overdue-rentals':
      currentRow = await generateOverdueRentalsExcel(worksheet, reportData, currentRow);
      break;
    case 'damage-logs':
      currentRow = await generateDamageLogsExcel(worksheet, reportData, currentRow);
      break;
  }
}

// PDF Generation Functions
async function generateEquipmentUtilizationPDF(doc, data) {
  doc.fontSize(14).text('Equipment Utilization by Type', { underline: true });
  doc.moveDown();

  if (data.utilizationByType && data.utilizationByType.length > 0) {
    data.utilizationByType.forEach(item => {
      doc.fontSize(12).text(`${item.equipment_type}: ${item.currently_rented}/${item.total_equipment} rented - ₱${item.total_revenue} revenue`);
    });
  }

  doc.moveDown();
  doc.fontSize(14).text('Most Rented Equipment', { underline: true });
  doc.moveDown();

  if (data.mostRented && data.mostRented.length > 0) {
    data.mostRented.forEach(item => {
      doc.fontSize(12).text(`${item.equipment_name} (${item.equipment_type}): ${item.rental_count} rentals - ₱${item.total_revenue}`);
    });
  }
}

async function generateIncomeSummaryPDF(doc, data) {
  doc.fontSize(14).text('Overall Statistics', { underline: true });
  doc.moveDown();

  if (data.overallStats) {
    const stats = data.overallStats;
    doc.fontSize(12).text(`Total Revenue: ₱${stats.total_revenue}`);
    doc.text(`Total Paid: ₱${stats.total_paid}`);
    doc.text(`Outstanding: ₱${stats.total_outstanding}`);
    doc.text(`Total Rentals: ${stats.total_rentals}`);
  }

  doc.moveDown();
  doc.fontSize(14).text('Revenue by Equipment Type', { underline: true });
  doc.moveDown();

  if (data.revenueByType && data.revenueByType.length > 0) {
    data.revenueByType.forEach(item => {
      doc.fontSize(12).text(`${item.equipment_type}: ₱${item.total_revenue} (${item.rental_count} rentals)`);
    });
  }
}

async function generateOverdueRentalsPDF(doc, data) {
  doc.fontSize(14).text('Overdue Summary', { underline: true });
  doc.moveDown();

  if (data.overdueSummary) {
    const summary = data.overdueSummary;
    doc.fontSize(12).text(`Total Overdue Rentals: ${summary.total_overdue}`);
    doc.text(`Average Days Overdue: ${summary.avg_days_overdue}`);
    doc.text(`Total Overdue Charges: ₱${summary.total_overdue_charges}`);
  }

  doc.moveDown();
  doc.fontSize(14).text('Overdue Rentals List', { underline: true });
  doc.moveDown();

  if (data.overdueRentals && data.overdueRentals.length > 0) {
    data.overdueRentals.forEach(item => {
      doc.fontSize(12).text(`${item.client_name}: ${item.equipment_name} - ${item.days_overdue} days overdue - ₱${item.overdue_charges}`);
    });
  }
}

async function generateDamageLogsPDF(doc, data) {
  doc.fontSize(14).text('Damage Summary', { underline: true });
  doc.moveDown();

  if (data.damageSummary) {
    const summary = data.damageSummary;
    doc.fontSize(12).text(`Total Damaged Returns: ${summary.total_damaged_returns}`);
    doc.text(`Total Damage Costs: ₱${summary.total_damage_costs}`);
  }

  doc.moveDown();
  doc.fontSize(14).text('Damage Incident Logs', { underline: true });
  doc.moveDown();

  if (data.damageLogs && data.damageLogs.length > 0) {
    data.damageLogs.forEach(item => {
      doc.fontSize(12).text(`${item.client_name}: ${item.equipment_name} - ₱${item.additional_charges} - ${item.damage_description || 'No description'}`);
    });
  }
}

// Excel Generation Functions
async function generateEquipmentUtilizationExcel(worksheet, data, startRow) {
  let currentRow = startRow;

  // Utilization by Type
  worksheet.getCell(`A${currentRow}`).value = 'Equipment Utilization by Type';
  worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 14 };
  currentRow += 2;

  worksheet.getCell(`A${currentRow}`).value = 'Equipment Type';
  worksheet.getCell(`B${currentRow}`).value = 'Total Equipment';
  worksheet.getCell(`C${currentRow}`).value = 'Currently Rented';
  worksheet.getCell(`D${currentRow}`).value = 'Total Revenue';
  worksheet.getCell(`E${currentRow}`).value = 'Avg Daily Rate';

  ['A', 'B', 'C', 'D', 'E'].forEach(col => {
    worksheet.getCell(`${col}${currentRow}`).font = { bold: true };
  });
  currentRow++;

  if (data.utilizationByType && data.utilizationByType.length > 0) {
    data.utilizationByType.forEach(item => {
      worksheet.getCell(`A${currentRow}`).value = item.equipment_type;
      worksheet.getCell(`B${currentRow}`).value = item.total_equipment;
      worksheet.getCell(`C${currentRow}`).value = item.currently_rented;
      worksheet.getCell(`D${currentRow}`).value = item.total_revenue;
      worksheet.getCell(`E${currentRow}`).value = item.avg_daily_rate;
      currentRow++;
    });
  }

  currentRow += 2;

  // Most Rented Equipment
  worksheet.getCell(`A${currentRow}`).value = 'Most Rented Equipment';
  worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 14 };
  currentRow += 2;

  worksheet.getCell(`A${currentRow}`).value = 'Equipment Name';
  worksheet.getCell(`B${currentRow}`).value = 'Type';
  worksheet.getCell(`C${currentRow}`).value = 'Rental Count';
  worksheet.getCell(`D${currentRow}`).value = 'Total Revenue';

  ['A', 'B', 'C', 'D'].forEach(col => {
    worksheet.getCell(`${col}${currentRow}`).font = { bold: true };
  });
  currentRow++;

  if (data.mostRented && data.mostRented.length > 0) {
    data.mostRented.forEach(item => {
      worksheet.getCell(`A${currentRow}`).value = item.equipment_name;
      worksheet.getCell(`B${currentRow}`).value = item.equipment_type;
      worksheet.getCell(`C${currentRow}`).value = item.rental_count;
      worksheet.getCell(`D${currentRow}`).value = item.total_revenue;
      currentRow++;
    });
  }

  return currentRow;
}

async function generateIncomeSummaryExcel(worksheet, data, startRow) {
  let currentRow = startRow;

  // Overall Statistics
  worksheet.getCell(`A${currentRow}`).value = 'Overall Statistics';
  worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 14 };
  currentRow += 2;

  if (data.overallStats) {
    const stats = data.overallStats;
    worksheet.getCell(`A${currentRow}`).value = 'Total Revenue';
    worksheet.getCell(`B${currentRow}`).value = stats.total_revenue;
    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'Total Paid';
    worksheet.getCell(`B${currentRow}`).value = stats.total_paid;
    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'Outstanding';
    worksheet.getCell(`B${currentRow}`).value = stats.total_outstanding;
    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'Total Rentals';
    worksheet.getCell(`B${currentRow}`).value = stats.total_rentals;
    currentRow++;
  }

  currentRow += 2;

  // Revenue by Type
  worksheet.getCell(`A${currentRow}`).value = 'Revenue by Equipment Type';
  worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 14 };
  currentRow += 2;

  worksheet.getCell(`A${currentRow}`).value = 'Equipment Type';
  worksheet.getCell(`B${currentRow}`).value = 'Rentals';
  worksheet.getCell(`C${currentRow}`).value = 'Revenue';
  worksheet.getCell(`D${currentRow}`).value = 'Avg Revenue';
  worksheet.getCell(`E${currentRow}`).value = 'Payment Rate';

  ['A', 'B', 'C', 'D', 'E'].forEach(col => {
    worksheet.getCell(`${col}${currentRow}`).font = { bold: true };
  });
  currentRow++;

  if (data.revenueByType && data.revenueByType.length > 0) {
    data.revenueByType.forEach(item => {
      worksheet.getCell(`A${currentRow}`).value = item.equipment_type;
      worksheet.getCell(`B${currentRow}`).value = item.rental_count;
      worksheet.getCell(`C${currentRow}`).value = item.total_revenue;
      worksheet.getCell(`D${currentRow}`).value = item.avg_revenue_per_rental;
      worksheet.getCell(`E${currentRow}`).value = `${item.payment_completion_rate}%`;
      currentRow++;
    });
  }

  return currentRow;
}

async function generateOverdueRentalsExcel(worksheet, data, startRow) {
  let currentRow = startRow;

  // Overdue Summary
  worksheet.getCell(`A${currentRow}`).value = 'Overdue Summary';
  worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 14 };
  currentRow += 2;

  if (data.overdueSummary) {
    const summary = data.overdueSummary;
    worksheet.getCell(`A${currentRow}`).value = 'Total Overdue Rentals';
    worksheet.getCell(`B${currentRow}`).value = summary.total_overdue;
    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'Avg Days Overdue';
    worksheet.getCell(`B${currentRow}`).value = summary.avg_days_overdue;
    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'Total Overdue Charges';
    worksheet.getCell(`B${currentRow}`).value = summary.total_overdue_charges;
    currentRow++;
  }

  currentRow += 2;

  // Overdue Rentals List
  worksheet.getCell(`A${currentRow}`).value = 'Overdue Rentals List';
  worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 14 };
  currentRow += 2;

  worksheet.getCell(`A${currentRow}`).value = 'Client';
  worksheet.getCell(`B${currentRow}`).value = 'Equipment';
  worksheet.getCell(`C${currentRow}`).value = 'Days Overdue';
  worksheet.getCell(`D${currentRow}`).value = 'Overdue Charges';
  worksheet.getCell(`E${currentRow}`).value = 'Outstanding';

  ['A', 'B', 'C', 'D', 'E'].forEach(col => {
    worksheet.getCell(`${col}${currentRow}`).font = { bold: true };
  });
  currentRow++;

  if (data.overdueRentals && data.overdueRentals.length > 0) {
    data.overdueRentals.forEach(item => {
      worksheet.getCell(`A${currentRow}`).value = item.client_name;
      worksheet.getCell(`B${currentRow}`).value = item.equipment_name;
      worksheet.getCell(`C${currentRow}`).value = item.days_overdue;
      worksheet.getCell(`D${currentRow}`).value = item.overdue_charges;
      worksheet.getCell(`E${currentRow}`).value = item.outstanding_amount;
      currentRow++;
    });
  }

  return currentRow;
}

async function generateDamageLogsExcel(worksheet, data, startRow) {
  let currentRow = startRow;

  // Damage Summary
  worksheet.getCell(`A${currentRow}`).value = 'Damage Summary';
  worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 14 };
  currentRow += 2;

  if (data.damageSummary) {
    const summary = data.damageSummary;
    worksheet.getCell(`A${currentRow}`).value = 'Total Damaged Returns';
    worksheet.getCell(`B${currentRow}`).value = summary.total_damaged_returns;
    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'Total Damage Costs';
    worksheet.getCell(`B${currentRow}`).value = summary.total_damage_costs;
    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = 'Avg Damage Cost';
    worksheet.getCell(`B${currentRow}`).value = summary.avg_damage_cost;
    currentRow++;
  }

  currentRow += 2;

  // Damage Logs
  worksheet.getCell(`A${currentRow}`).value = 'Damage Incident Logs';
  worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 14 };
  currentRow += 2;

  worksheet.getCell(`A${currentRow}`).value = 'Client';
  worksheet.getCell(`B${currentRow}`).value = 'Equipment';
  worksheet.getCell(`C${currentRow}`).value = 'Damage Description';
  worksheet.getCell(`D${currentRow}`).value = 'Additional Charges';
  worksheet.getCell(`E${currentRow}`).value = 'Date';

  ['A', 'B', 'C', 'D', 'E'].forEach(col => {
    worksheet.getCell(`${col}${currentRow}`).font = { bold: true };
  });
  currentRow++;

  if (data.damageLogs && data.damageLogs.length > 0) {
    data.damageLogs.forEach(item => {
      worksheet.getCell(`A${currentRow}`).value = item.client_name;
      worksheet.getCell(`B${currentRow}`).value = item.equipment_name;
      worksheet.getCell(`C${currentRow}`).value = item.damage_description || 'No description';
      worksheet.getCell(`D${currentRow}`).value = item.additional_charges;
      worksheet.getCell(`E${currentRow}`).value = new Date(item.created_at).toLocaleDateString();
      currentRow++;
    });
  }

  return currentRow;
}

// Load environment variables
require('dotenv').config();

let mainWindow;
let db;

// Function to register IPC handlers after database is connected
function registerIPCHandlers() {
  console.log('Electron: Registering IPC handlers...');
  ipcMain.handle('db-login', async (event, username, password) => {
    console.log('Electron: db-login handler called with username:', username);
    const startTime = performance.now();
    try {
      console.log('Electron: Starting login query');
      const [rows] = await db.execute(
        'SELECT * FROM users WHERE username = ?',
        [username]
      );

      const endTime = performance.now();
      if (rows.length === 0) {
        console.log(`Electron: Login query completed in ${endTime - startTime}ms - user not found`);
        throw new Error('Invalid username or password');
      }

      const user = rows[0];
      const isValidPassword = bcrypt.compareSync(password, user.password);

      if (!isValidPassword) {
        console.log(`Electron: Login query completed in ${endTime - startTime}ms - invalid password`);
        throw new Error('Invalid username or password');
      }

      console.log(`Electron: Login query completed in ${endTime - startTime}ms - success`);
      return {
        id: user.id,
        username: user.username,
        role: user.role
      };
    } catch (error) {
      const endTime = performance.now();
      console.log(`Electron: Login query failed in ${endTime - startTime}ms - ${error.message}`);
      throw error;
    }
  });

  ipcMain.handle('db-register', async (event, userData) => {
    try {
      const [existingUsers] = await db.execute(
        'SELECT id FROM users WHERE username = ?',
        [userData.username]
      );

      if (existingUsers.length > 0) {
        throw new Error('Username already exists');
      }

      const hashedPassword = bcrypt.hashSync(userData.password, 10);

      const [result] = await db.execute(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        [userData.username, hashedPassword, userData.role || 'staff']
      );

      return {
        id: result.insertId,
        username: userData.username,
        role: userData.role || 'staff'
      };
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('db-get-clients', async (event, options = {}) => {
    console.log('Electron: Starting clients query with options:', options);
    const startTime = performance.now();
    try {
      const { page = 1, limit = 10 } = options;
      console.log('Electron: extracted page:', page, 'type:', typeof page);
      console.log('Electron: extracted limit:', limit, 'type:', typeof limit);

      // Validate and sanitize parameters
      const validatedPage = Math.max(1, parseInt(page) || 1);
      const validatedLimit = Math.max(1, Math.min(100, parseInt(limit) || 10)); // Max 100 items per page
      console.log('Electron: validated page:', validatedPage, 'limit:', validatedLimit);

      const offset = (validatedPage - 1) * validatedLimit;
      console.log('Electron: calculated offset:', offset, 'type:', typeof offset);

      // Get total count
      const [countResult] = await db.execute('SELECT COUNT(*) as total FROM clients');
      const totalItems = countResult[0].total;
      console.log('Electron: Total clients in database:', totalItems);

      // Get paginated results
      const [rows] = await db.execute(`SELECT * FROM clients ORDER BY created_at DESC LIMIT ${validatedLimit} OFFSET ${offset}`);

      const endTime = performance.now();
      console.log(`Electron: Clients query completed in ${endTime - startTime}ms, returned ${rows.length} records`);

      return {
        data: rows,
        pagination: {
          page: validatedPage,
          limit: validatedLimit,
          totalItems,
          totalPages: Math.ceil(totalItems / validatedLimit)
        }
      };
    } catch (error) {
      const endTime = performance.now();
      console.log(`Electron: Clients query failed in ${endTime - startTime}ms - ${error.message}`);
      throw error;
    }
  });

  ipcMain.handle('db-add-client', async (event, clientData) => {
    try {
      const [result] = await db.execute(
        'INSERT INTO clients (name, contact_number, email, project_site, address) VALUES (?, ?, ?, ?, ?)',
        [clientData.name, clientData.contact_number, clientData.email, clientData.project_site, clientData.address]
      );
      return { id: result.insertId };
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('db-update-client', async (event, id, clientData) => {
    try {
      const [result] = await db.execute(
        'UPDATE clients SET name = ?, contact_number = ?, email = ?, project_site = ?, address = ? WHERE id = ?',
        [clientData.name, clientData.contact_number, clientData.email, clientData.project_site, clientData.address, id]
      );
      return { changes: result.affectedRows };
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('db-delete-client', async (event, id) => {
    try {
      const [result] = await db.execute('DELETE FROM clients WHERE id = ?', [id]);
      return { changes: result.affectedRows };
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('db-get-equipment', async () => {
    console.log('Electron: Starting equipment query');
    const startTime = performance.now();
    try {
      const [rows] = await db.execute('SELECT * FROM equipment ORDER BY created_at DESC');
      const endTime = performance.now();
      console.log(`Electron: Equipment query completed in ${endTime - startTime}ms, returned ${rows.length} records`);
      return rows;
    } catch (error) {
      const endTime = performance.now();
      console.log(`Electron: Equipment query failed in ${endTime - startTime}ms - ${error.message}`);
      throw error;
    }
  });

  ipcMain.handle('db-add-equipment', async (event, equipmentData) => {
    try {
      const quantityAvailable = equipmentData.quantity_available ?? equipmentData.quantity_total ?? 1;
      const status = quantityAvailable > 0 ? 'available' : 'rented';
      const [result] = await db.execute(
        'INSERT INTO equipment (name, type, rate_per_hour, status, description, quantity_total, quantity_available) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          equipmentData.name,
          equipmentData.type,
          equipmentData.rate_per_hour,
          status,
          equipmentData.description,
          equipmentData.quantity_total ?? 1,
          quantityAvailable
        ]
      );
      return { id: result.insertId };
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('db-update-equipment', async (event, id, equipmentData) => {
    try {
      const quantityAvailable = equipmentData.quantity_available ?? equipmentData.quantity_total ?? 1;
      const status = quantityAvailable > 0 ? 'available' : 'rented';
      const [result] = await db.execute(
        'UPDATE equipment SET name = ?, type = ?, rate_per_hour = ?, status = ?, description = ?, quantity_total = ?, quantity_available = ? WHERE id = ?',
        [
          equipmentData.name,
          equipmentData.type,
          equipmentData.rate_per_hour,
          status,
          equipmentData.description,
          equipmentData.quantity_total ?? 1,
          quantityAvailable,
          id
        ]
      );
      return { changes: result.affectedRows };
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('db-delete-equipment', async (event, id) => {
    try {
      const [result] = await db.execute('DELETE FROM equipment WHERE id = ?', [id]);
      return { changes: result.affectedRows };
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('db-get-rentals', async (event, options = {}) => {
    try {
      console.log('Backend: db-get-rentals called with raw options:', options);
      console.log('Backend: options type:', typeof options);
      console.log('Backend: options keys:', Object.keys(options || {}));

      const { page = 1, limit = 10, status } = options;
      console.log('Backend: extracted page:', page, 'type:', typeof page);
      console.log('Backend: extracted limit:', limit, 'type:', typeof limit);
      console.log('Backend: extracted status:', status, 'type:', typeof status);

      // Validate and sanitize parameters
      const validatedPage = Math.max(1, parseInt(page) || 1);
      const validatedLimit = Math.max(1, Math.min(100, parseInt(limit) || 10)); // Max 100 items per page
      console.log('Backend: validated page:', validatedPage, 'limit:', validatedLimit);

      const offset = (validatedPage - 1) * validatedLimit;
      console.log('Backend: calculated offset:', offset, 'type:', typeof offset);

      let countSql;
      let countParams = [];
      let sql;
      let params;

      if (status && status !== 'all') {
        countSql = 'SELECT COUNT(*) as total FROM rentals WHERE status = ?';
        countParams = [status];
        sql = `SELECT r.*, c.name as client_name, e.name as equipment_name, e.type as equipment_type FROM rentals r JOIN clients c ON r.client_id = c.id JOIN equipment e ON r.equipment_id = e.id WHERE r.status = ? ORDER BY r.created_at DESC LIMIT ${validatedLimit} OFFSET ${offset}`;
        params = [status];
        console.log('Backend: applying status filter:', status);
      } else {
        countSql = 'SELECT COUNT(*) as total FROM rentals';
        sql = `SELECT r.*, c.name as client_name, e.name as equipment_name, e.type as equipment_type FROM rentals r JOIN clients c ON r.client_id = c.id JOIN equipment e ON r.equipment_id = e.id ORDER BY r.created_at DESC LIMIT ${validatedLimit} OFFSET ${offset}`;
        params = [];
      }

      console.log('Backend: count query:', countSql, 'params:', countParams);

      // Get total count with status filter
      const [countResult] = await db.execute(countSql, countParams);
      const totalItems = countResult[0].total;

      console.log('Backend: total items found:', totalItems);

      console.log('Backend: main query params:', params);
      console.log('Backend: SQL to execute:', sql);
      console.log('Backend: params array:', params, 'length:', params.length);
      console.log('Backend: param types:', params.map(p => typeof p));
      console.log('Backend: param values:', params.map(p => `${p} (${typeof p})`));

      // Get paginated results with status filter
      const [rows] = await db.execute(sql, params);

      console.log('Backend: rows returned:', rows.length);

      return {
        data: rows,
        pagination: {
          page: validatedPage,
          limit: validatedLimit,
          totalItems,
          totalPages: Math.ceil(totalItems / validatedLimit)
        }
      };
    } catch (error) {
      console.error('Backend: db-get-rentals error:', error);
      throw error;
    }
  });

  ipcMain.handle('db-add-rental', async (event, rentalData) => {
      // Use database transaction to prevent race conditions
      const connection = db;
      await connection.beginTransaction();
  
      try {
          // Lock the equipment row for update to prevent concurrent modifications
          const [equipmentRows] = await connection.execute(
              'SELECT quantity_available, quantity_total FROM equipment WHERE id = ? FOR UPDATE',
              [rentalData.equipment_id]
          );
          const eq = equipmentRows[0];
          const qty = rentalData.quantity ?? 1;
  
          if (!eq || eq.quantity_available < qty) {
              await connection.rollback();
              throw new Error('Insufficient equipment quantity available');
          }
  
          const [result] = await connection.execute(
              'INSERT INTO rentals (client_id, equipment_id, start_date, end_date, rate_per_hour, total_amount, quantity, status, payment_status, total_paid, overnight_custody) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [
                  rentalData.client_id,
                  rentalData.equipment_id,
                  rentalData.start_date,
                  rentalData.end_date,
                  rentalData.rate_per_hour,
                  rentalData.total_amount,
                  qty,
                  rentalData.status,
                  'unpaid', // New rentals start as unpaid
                  0, // No payments made yet
                  rentalData.overnight_custody || 'owner' // Default to owner if not specified
              ]
          );
  
          await connection.execute('UPDATE equipment SET quantity_available = quantity_available - ? WHERE id = ?', [qty, rentalData.equipment_id]);
          await connection.execute(
              `UPDATE equipment SET status = CASE WHEN quantity_available > 0 THEN 'available' ELSE 'rented' END WHERE id = ?`,
              [rentalData.equipment_id]
          );
  
          await connection.commit();
          return { id: result.insertId };
      } catch (error) {
          await connection.rollback();
          throw error;
      }
  });

  ipcMain.handle('db-update-rental', async (event, id, rentalData) => {
    try {
      const [result] = await db.execute(
        'UPDATE rentals SET client_id = ?, equipment_id = ?, start_date = ?, end_date = ?, rate_per_hour = ?, total_amount = ?, status = ?, overnight_custody = ? WHERE id = ?',
        [rentalData.client_id, rentalData.equipment_id, rentalData.start_date, rentalData.end_date, rentalData.rate_per_hour, rentalData.total_amount, rentalData.status, rentalData.overnight_custody || 'owner', id]
      );
      return { changes: result.affectedRows };
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('db-delete-rental', async (event, id) => {
      // Use database transaction to prevent race conditions
      const connection = db;
      await connection.beginTransaction();
  
      try {
          const [rentalRows] = await connection.execute('SELECT equipment_id, quantity FROM rentals WHERE id = ?', [id]);
          const rental = rentalRows[0];
  
          const [result] = await connection.execute('DELETE FROM rentals WHERE id = ?', [id]);
  
          if (rental) {
              // Lock equipment row for update
              await connection.execute('SELECT * FROM equipment WHERE id = ? FOR UPDATE', [rental.equipment_id]);
              const qty = rental.quantity ?? 1;
              await connection.execute('UPDATE equipment SET quantity_available = quantity_available + ? WHERE id = ?', [qty, rental.equipment_id]);

              // Determine status based on whether all items are accounted for
              const [statusCheck] = await connection.execute('SELECT quantity_total, quantity_available, maintenance_quantity FROM equipment WHERE id = ?', [rental.equipment_id]);
              const { quantity_total, quantity_available, maintenance_quantity } = statusCheck[0];
              const status = (quantity_available + maintenance_quantity) >= quantity_total ? 'available' : 'rented';
              await connection.execute('UPDATE equipment SET status = ? WHERE id = ?', [status, rental.equipment_id]);
          }
  
          await connection.commit();
          return { changes: result.affectedRows };
      } catch (error) {
          await connection.rollback();
          throw error;
      }
  });

  ipcMain.handle('db-get-available-equipment', async () => {
    try {
      const [rows] = await db.execute('SELECT * FROM equipment WHERE status = ? ORDER BY name', ['available']);
      return rows;
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('db-get-returns', async (event, options = {}) => {
    console.log('Electron: Starting returns query with raw options:', options);
    console.log('Electron: options type:', typeof options);
    console.log('Electron: options keys:', Object.keys(options || {}));
    const startTime = performance.now();
    try {
      const { page = 1, limit = 10 } = options;
      console.log('Electron: extracted page:', page, 'type:', typeof page);
      console.log('Electron: extracted limit:', limit, 'type:', typeof limit);

      // Validate and sanitize parameters
      const validatedPage = Math.max(1, parseInt(page) || 1);
      const validatedLimit = Math.max(1, Math.min(100, parseInt(limit) || 10)); // Max 100 items per page
      console.log('Electron: validated page:', validatedPage, 'limit:', validatedLimit);

      const offset = (validatedPage - 1) * validatedLimit;
      console.log('Electron: calculated offset:', offset, 'type:', typeof offset);

      // Get total count
      const [countResult] = await db.execute('SELECT COUNT(*) as total FROM returns');
      const totalItems = countResult[0].total;
      console.log('Electron: Total returns in database:', totalItems);

      const params = [];
      console.log('Electron: params array:', params, 'length:', params.length);
      console.log('Electron: param types:', params.map(p => typeof p));
      console.log('Electron: param values:', params.map(p => `${p} (${typeof p})`));

      // Get paginated results
      const [rows] = await db.execute(`
        SELECT r.*,
                rental.client_id,
                c.name as client_name,
                e.name as equipment_name,
                e.type as equipment_type,
                rental.start_date,
                rental.end_date,
                rental.rate_per_hour,
                rental.total_amount
        FROM returns r
        JOIN rentals rental ON r.rental_id = rental.id
        JOIN clients c ON rental.client_id = c.id
        JOIN equipment e ON rental.equipment_id = e.id
        ORDER BY r.created_at DESC
        LIMIT ${validatedLimit} OFFSET ${offset}
      `, params);

      const endTime = performance.now();
      console.log(`Electron: Returns query completed in ${endTime - startTime}ms, returned ${rows.length} records`);
      console.log('Electron: Sample return record:', rows.length > 0 ? rows[0] : 'No records found');

      return {
        data: rows,
        pagination: {
          page: validatedPage,
          limit: validatedLimit,
          totalItems,
          totalPages: Math.ceil(totalItems / validatedLimit)
        }
      };
    } catch (error) {
      const endTime = performance.now();
      console.log(`Electron: Returns query failed in ${endTime - startTime}ms - ${error.message}`);
      throw error;
    }
  });

  ipcMain.handle('db-add-return', async (event, returnData) => {
      // Use database transaction to prevent race conditions
      const connection = db;
      await connection.beginTransaction();
  
      try {
          // Check payment status before allowing return
          const [rentalRows] = await connection.execute('SELECT payment_status, total_amount, total_paid FROM rentals WHERE id = ?', [returnData.rental_id]);
          const rental = rentalRows[0];
  
          if (!rental) {
              await connection.rollback();
              throw new Error('Rental not found');
          }
  
          // Allow return only if payment is complete or if it's a damaged return (may require additional charges)
          if (rental.payment_status !== 'paid' && returnData.condition !== 'damaged') {
              await connection.rollback();
              throw new Error(`Cannot return equipment: Payment status is ${rental.payment_status}. Please complete payment first.`);
          }
  
          const [result] = await connection.execute(
              'INSERT INTO returns (rental_id, return_date, `condition`, damage_description, additional_charges, damaged_count, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [returnData.rental_id, returnData.return_date, returnData.condition, returnData.damage_description, returnData.additional_charges, returnData.damaged_count || 1, returnData.notes]
          );
  
          await connection.execute('UPDATE rentals SET status = ? WHERE id = ?', ['returned', returnData.rental_id]);
  
          const [equipmentRows] = await connection.execute('SELECT equipment_id, quantity FROM rentals WHERE id = ?', [returnData.rental_id]);
          const r = equipmentRows[0];
  
          if (r) {
              // Lock equipment row for update
              await connection.execute('SELECT * FROM equipment WHERE id = ? FOR UPDATE', [r.equipment_id]);
              const qty = r.quantity ?? 1;
              let availableIncrease = 0;
              let maintenanceIncrease = 0;

              if (returnData.condition === 'good') {
                  availableIncrease = qty;
              } else if (returnData.condition === 'damaged') {
                  const damagedCount = returnData.damaged_count || qty;
                  availableIncrease = qty - damagedCount;
                  maintenanceIncrease = damagedCount;
              } else if (returnData.condition === 'lost') {
                  // For lost, don't add to available, perhaps add to maintenance
                  maintenanceIncrease = qty;
              }

              await connection.execute('UPDATE equipment SET quantity_available = quantity_available + ?, maintenance_quantity = maintenance_quantity + ? WHERE id = ?', [availableIncrease, maintenanceIncrease, r.equipment_id]);

              // Determine status based on whether all items are accounted for (available + maintenance = total means no rentals)
              const [statusCheck] = await connection.execute('SELECT quantity_total, quantity_available, maintenance_quantity FROM equipment WHERE id = ?', [r.equipment_id]);
              const { quantity_total, quantity_available, maintenance_quantity } = statusCheck[0];
              const status = (quantity_available + maintenance_quantity) >= quantity_total ? 'available' : 'rented';
              await connection.execute('UPDATE equipment SET status = ? WHERE id = ?', [status, r.equipment_id]);
          }
  
          await connection.commit();
          return { id: result.insertId };
      } catch (error) {
          await connection.rollback();
          throw error;
      }
  });

  ipcMain.handle('db-update-return', async (event, id, returnData) => {
    try {
      const [result] = await db.execute(
        'UPDATE returns SET return_date = ?, `condition` = ?, damage_description = ?, additional_charges = ?, notes = ? WHERE id = ?',
        [returnData.return_date, returnData.condition, returnData.damage_description, returnData.additional_charges, returnData.notes, id]
      );
      return { changes: result.affectedRows };
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('db-delete-return', async (event, id) => {
    try {
      const [returnRows] = await db.execute('SELECT rental_id FROM returns WHERE id = ?', [id]);
      const returnRecord = returnRows[0];

      const [result] = await db.execute('DELETE FROM returns WHERE id = ?', [id]);

      if (returnRecord) {
        await db.execute('UPDATE rentals SET status = ? WHERE id = ?', ['active', returnRecord.rental_id]);
        await db.execute(`
          UPDATE equipment
          SET status = ?
          WHERE id = (SELECT equipment_id FROM rentals WHERE id = ?)
        `, ['rented', returnRecord.rental_id]);
      }

      return { changes: result.affectedRows };
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('db-get-active-rentals', async () => {
    console.log('Electron: Starting active rentals query');
    const startTime = performance.now();
    try {
      const [rows] = await db.execute(`
        SELECT r.*, c.name as client_name, e.name as equipment_name, e.type as equipment_type
        FROM rentals r
        JOIN clients c ON r.client_id = c.id
        JOIN equipment e ON r.equipment_id = e.id
        WHERE r.status = 'active'
        ORDER BY r.end_date ASC
      `);
      const endTime = performance.now();
      console.log(`Electron: Active rentals query completed in ${endTime - startTime}ms, returned ${rows.length} records`);
      return rows;
    } catch (error) {
      const endTime = performance.now();
      console.log(`Electron: Active rentals query failed in ${endTime - startTime}ms - ${error.message}`);
      throw error;
    }
  });

  ipcMain.handle('db-get-dashboard-stats', async () => {
    console.log('Electron: Starting dashboard stats query');
    const startTime = performance.now();
    try {
      const currentDate = new Date();
      const thirtyDaysAgo = new Date(currentDate.getTime() - (30 * 24 * 60 * 60 * 1000));
      const currentDateStr = currentDate.toISOString().split('T')[0];
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

      const sixtyDaysAgo = new Date(currentDate.getTime() - (60 * 24 * 60 * 60 * 1000));
      const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().split('T')[0];

      console.log('Electron: Executing dashboard queries');
      const queryStart = performance.now();

      const [clientsResult] = await db.execute('SELECT COUNT(*) as count FROM clients');
      const totalClients = clientsResult[0].count;

      const [clientsPrevResult] = await db.execute('SELECT COUNT(*) as count FROM clients WHERE created_at < ?', [thirtyDaysAgoStr]);
      const totalClientsPrev = clientsPrevResult[0].count;

      const [equipmentResult] = await db.execute('SELECT COUNT(*) as count FROM equipment');
      const totalEquipment = equipmentResult[0].count;

      const [equipmentPrevResult] = await db.execute('SELECT COUNT(*) as count FROM equipment WHERE created_at < ?', [thirtyDaysAgoStr]);
      const totalEquipmentPrev = equipmentPrevResult[0].count;

      const [activeRentalsResult] = await db.execute('SELECT COUNT(*) as count FROM rentals WHERE status = ?', ['active']);
      const activeRentals = activeRentalsResult[0].count;

      const [activeRentalsPrevResult] = await db.execute('SELECT COUNT(*) as count FROM rentals WHERE status = ? AND created_at < ?', ['active', thirtyDaysAgoStr]);
      const activeRentalsPrev = activeRentalsPrevResult[0].count;

      const [revenueResult] = await db.execute('SELECT COALESCE(SUM(total_amount), 0) as total FROM rentals');
      const totalRevenue = parseFloat(revenueResult[0].total);

      const [revenuePrevResult] = await db.execute('SELECT COALESCE(SUM(total_amount), 0) as total FROM rentals WHERE created_at < ?', [thirtyDaysAgoStr]);
      const totalRevenuePrev = parseFloat(revenuePrevResult[0].total);

      const [overdueResult] = await db.execute('SELECT COUNT(*) as count FROM rentals WHERE status = ? AND end_date < CURDATE()', ['active']);
      const overdueRentals = overdueResult[0].count;

      const [overduePrevResult] = await db.execute('SELECT COUNT(*) as count FROM rentals WHERE status = ? AND end_date < ? AND created_at < ?', ['active', currentDateStr, thirtyDaysAgoStr]);
      const overdueRentalsPrev = overduePrevResult[0].count;

      const [availableResult] = await db.execute('SELECT COUNT(*) as count FROM equipment WHERE status = ?', ['available']);
      const availableEquipment = availableResult[0].count;

      const [availablePrevResult] = await db.execute('SELECT COUNT(*) as count FROM equipment WHERE status = ? AND created_at < ?', ['available', thirtyDaysAgoStr]);
      const availableEquipmentPrev = availablePrevResult[0].count;

      const queryEnd = performance.now();
      console.log(`Electron: Dashboard queries completed in ${queryEnd - queryStart}ms`);

      const calculateChange = (current, previous) => {
        if (previous === 0) return current > 0 ? '+100%' : '0%';
        const change = ((current - previous) / previous) * 100;
        const sign = change >= 0 ? '+' : '';
        return `${sign}${change.toFixed(1)}%`;
      };

      const endTime = performance.now();
      console.log(`Electron: Dashboard stats completed in ${endTime - startTime}ms`);
      return {
        totalClients,
        totalEquipment,
        activeRentals,
        totalRevenue,
        overdueRentals,
        availableEquipment,
        trends: {
          totalClients: calculateChange(totalClients, totalClientsPrev),
          totalEquipment: calculateChange(totalEquipment, totalEquipmentPrev),
          activeRentals: calculateChange(activeRentals, activeRentalsPrev),
          totalRevenue: calculateChange(totalRevenue, totalRevenuePrev),
          overdueRentals: calculateChange(overdueRentals, overdueRentalsPrev),
          availableEquipment: calculateChange(availableEquipment, availableEquipmentPrev)
        }
      };
    } catch (error) {
      const endTime = performance.now();
      console.log(`Electron: Dashboard stats failed in ${endTime - startTime}ms - ${error.message}`);
      throw error;
    }
  });

  ipcMain.handle('db-get-recent-rentals', async (event, limit = 5) => {
    try {
      const validatedLimit = Math.max(1, Math.min(50, parseInt(limit) || 5)); // Max 50 for recent rentals
      const [rows] = await db.execute(`
        SELECT r.*,
                c.name as client_name,
                e.name as equipment_name,
                e.type as equipment_type
        FROM rentals r
        JOIN clients c ON r.client_id = c.id
        JOIN equipment e ON r.equipment_id = e.id
        ORDER BY r.created_at DESC
        LIMIT ${validatedLimit}
        `, []);
      return rows;
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('db-get-payments', async (event, options = {}) => {
    console.log('Electron: Starting payments query');
    const startTime = performance.now();
    try {
      const { page = 1, limit = 10 } = options;
      console.log('Electron: extracted page:', page, 'type:', typeof page);
      console.log('Electron: extracted limit:', limit, 'type:', typeof limit);

      // Validate and sanitize parameters
      const validatedPage = Math.max(1, parseInt(page) || 1);
      const validatedLimit = Math.max(1, Math.min(100, parseInt(limit) || 10)); // Max 100 items per page
      console.log('Electron: validated page:', validatedPage, 'limit:', validatedLimit);

      const offset = (validatedPage - 1) * validatedLimit;
      console.log('Electron: calculated offset:', offset, 'type:', typeof offset);

      // Get total count
      const [countResult] = await db.execute('SELECT COUNT(*) as total FROM payments');
      const totalItems = countResult[0].total;

      // Get paginated results
      const [rows] = await db.execute(`
        SELECT p.*,
               r.client_id,
               c.name as client_name,
               r.equipment_id,
               e.name as equipment_name
        FROM payments p
        JOIN rentals r ON p.rental_id = r.id
        JOIN clients c ON r.client_id = c.id
        JOIN equipment e ON r.equipment_id = e.id
        ORDER BY p.payment_date DESC
        LIMIT ${validatedLimit} OFFSET ${offset}
        `, []);

      const endTime = performance.now();
      console.log(`Electron: Payments query completed in ${endTime - startTime}ms, returned ${rows.length} records`);

      return {
        data: rows,
        pagination: {
          page: validatedPage,
          limit: validatedLimit,
          totalItems,
          totalPages: Math.ceil(totalItems / validatedLimit)
        }
      };
    } catch (error) {
      const endTime = performance.now();
      console.log(`Electron: Payments query failed in ${endTime - startTime}ms - ${error.message}`);
      console.error('Full error details:', error);
      throw error;
    }
  });

  ipcMain.handle('db-add-payment', async (event, paymentData) => {
      // Use database transaction to prevent race conditions
      const connection = db;
      await connection.beginTransaction();

      try {
          console.log('Electron: Adding payment:', paymentData);

          // Get current rental data to determine payment type
          const [rentalRows] = await connection.execute('SELECT total_amount, total_paid FROM rentals WHERE id = ? FOR UPDATE', [paymentData.rental_id]);
          const rental = rentalRows[0];

          if (!rental) {
              await connection.rollback();
              throw new Error('Rental not found');
          }

          const currentTotalPaid = parseFloat(rental.total_paid || 0);
          const paymentAmount = parseFloat(paymentData.amount);
          const totalAmount = parseFloat(rental.total_amount);
          const newTotalPaid = currentTotalPaid + paymentAmount;

          // Automatically determine payment type based on the payment amount and current status
          let paymentType;
          if (newTotalPaid >= totalAmount) {
              // This payment completes the full amount
              paymentType = 'full';
          } else {
              // This is a partial payment
              paymentType = 'partial';
          }

          console.log('Electron: Calculated payment type:', paymentType, {
              currentTotalPaid,
              paymentAmount,
              newTotalPaid,
              totalAmount
          });

          // Insert the payment record with auto-determined payment type
          const [result] = await connection.execute(
              'INSERT INTO payments (rental_id, amount, payment_type, payment_date, notes) VALUES (?, ?, ?, ?, ?)',
              [paymentData.rental_id, paymentData.amount, paymentType, paymentData.payment_date, paymentData.notes]
          );

          console.log('Electron: Payment inserted, ID:', result.insertId);

          // Update the rental's payment status and total paid
          let rentalPaymentStatus;
          if (newTotalPaid >= totalAmount) {
              rentalPaymentStatus = 'paid';
          } else if (newTotalPaid > 0) {
              rentalPaymentStatus = 'partial';
          } else {
              rentalPaymentStatus = 'unpaid';
          }

          console.log('Electron: Updating rental payment status:', { newTotalPaid, rentalPaymentStatus });

          await connection.execute(
              'UPDATE rentals SET total_paid = ?, payment_status = ? WHERE id = ?',
              [newTotalPaid, rentalPaymentStatus, paymentData.rental_id]
          );

          console.log('Electron: Rental payment status updated successfully');

          await connection.commit();
          return { id: result.insertId, paymentType };
      } catch (error) {
          await connection.rollback();
          console.error('Electron: Error adding payment:', error);
          throw error;
      }
  });

  ipcMain.handle('db-update-payment', async (event, id, paymentData) => {
    try {
      const [result] = await db.execute(
        'UPDATE payments SET rental_id = ?, amount = ?, payment_type = ?, payment_date = ?, notes = ? WHERE id = ?',
        [paymentData.rental_id, paymentData.amount, paymentData.payment_type, paymentData.payment_date, paymentData.notes, id]
      );
      return { changes: result.affectedRows };
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('db-delete-payment', async (event, id) => {
      // Use database transaction to prevent race conditions
      const connection = db;
      await connection.beginTransaction();
  
      try {
          // First, get the payment details to adjust rental totals
          const [paymentRows] = await connection.execute('SELECT rental_id, amount FROM payments WHERE id = ?', [id]);
          const payment = paymentRows[0];
  
          if (payment) {
              // Delete the payment
              const [result] = await connection.execute('DELETE FROM payments WHERE id = ?', [id]);
  
              // Update the rental's payment status and total paid
              const [rentalRows] = await connection.execute('SELECT total_amount, total_paid FROM rentals WHERE id = ? FOR UPDATE', [payment.rental_id]);
              const rental = rentalRows[0];
  
              if (rental) {
                  const newTotalPaid = parseFloat(rental.total_paid) - parseFloat(payment.amount);
                  const totalAmount = parseFloat(rental.total_amount);
  
                  let paymentStatus;
                  if (newTotalPaid >= totalAmount) {
                      paymentStatus = 'paid';
                  } else if (newTotalPaid > 0) {
                      paymentStatus = 'partial';
                  } else {
                      paymentStatus = 'unpaid';
                  }
  
                  await connection.execute(
                      'UPDATE rentals SET total_paid = ?, payment_status = ? WHERE id = ?',
                      [newTotalPaid, paymentStatus, payment.rental_id]
                  );
              }
  
              await connection.commit();
              return { changes: result.affectedRows };
          }
  
          await connection.commit();
          return { changes: 0 };
      } catch (error) {
          await connection.rollback();
          throw error;
      }
  });

  ipcMain.handle('db-get-payments-by-rental', async (event, rentalId) => {
    try {
      const [rows] = await db.execute('SELECT * FROM payments WHERE rental_id = ? ORDER BY payment_date DESC', [rentalId]);
      return rows;
    } catch (error) {
      throw error;
    }
  });

  // Chart data handlers
  ipcMain.handle('db-get-revenue-chart-data', async (event, timePeriod = 'monthly') => {
    console.log('Electron: Starting revenue chart data query for period:', timePeriod);
    const startTime = performance.now();
    try {
      let dateFormat, interval, intervalValue;

      switch (timePeriod) {
        case 'daily':
          dateFormat = '%Y-%m-%d';
          interval = 'DAY';
          intervalValue = 30; // Last 30 days for daily
          break;
        case 'weekly':
          dateFormat = '%Y-%u'; // Year-week format
          interval = 'WEEK';
          intervalValue = 12; // Last 12 weeks
          break;
        case 'yearly':
          dateFormat = '%Y';
          interval = 'YEAR';
          intervalValue = 5; // Last 5 years
          break;
        case 'monthly':
        default:
          dateFormat = '%Y-%m';
          interval = 'MONTH';
          intervalValue = 12; // Last 12 months
          break;
      }

      // First, let's check what data exists in the database
      const [allRentals] = await db.execute(`
        SELECT
          DATE_FORMAT(created_at, '%Y-%m-%d') as date,
          COUNT(*) as count,
          MIN(created_at) as earliest,
          MAX(created_at) as latest
        FROM rentals
        GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
        ORDER BY date DESC
        LIMIT 10
      `);

      console.log('All rental dates in database:', allRentals);

      const [rows] = await db.execute(`
        SELECT
          DATE_FORMAT(created_at, '${dateFormat}') as period,
          SUM(total_amount) as revenue,
          COUNT(*) as rental_count
        FROM rentals
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ${intervalValue} ${interval})
        GROUP BY DATE_FORMAT(created_at, '${dateFormat}')
        ORDER BY period ASC
      `);

      console.log(`Revenue chart query returned ${rows.length} rows for ${timePeriod} period`);
      console.log('Query parameters:', { dateFormat, interval, intervalValue });
      console.log('SQL executed:', `
        SELECT DATE_FORMAT(created_at, '${dateFormat}') as period, SUM(total_amount) as revenue, COUNT(*) as rental_count
        FROM rentals
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ${intervalValue} ${interval})
        GROUP BY DATE_FORMAT(created_at, '${dateFormat}')
        ORDER BY period ASC
      `);

      if (rows.length > 0) {
        console.log('Sample data:', rows.slice(0, 3));
      } else {
        console.log('No data returned from query');
      }

      const endTime = performance.now();
      console.log(`Electron: Revenue chart data completed in ${endTime - startTime}ms for ${timePeriod} period`);

      return rows;
    } catch (error) {
      const endTime = performance.now();
      console.log(`Electron: Revenue chart data failed in ${endTime - startTime}ms - ${error.message}`);
      throw error;
    }
  });

  ipcMain.handle('db-get-equipment-chart-data', async (event, period = 'all') => {
    console.log('Electron: Starting equipment chart data query for period:', period);
    const startTime = performance.now();
    try {
      let dateFilter = '';

      if (period !== 'all') {
        let interval, intervalValue;
        switch (period) {
          case 'weekly':
            interval = 'WEEK';
            intervalValue = 1;
            break;
          case 'monthly':
            interval = 'MONTH';
            intervalValue = 1;
            break;
          case 'yearly':
            interval = 'YEAR';
            intervalValue = 1;
            break;
          default:
            interval = 'MONTH';
            intervalValue = 1;
        }
        // Filter by rental period (start_date to end_date) instead of created_at
        dateFilter = `AND (
          (r.start_date <= CURDATE() AND r.end_date >= DATE_SUB(CURDATE(), INTERVAL ${intervalValue} ${interval}))
          OR r.status = 'active'
        )`;
      }

      // Get equipment utilization by type
      const sql = `
        SELECT
          e.type as equipment_type,
          COUNT(DISTINCT e.id) as total_equipment,
          COUNT(DISTINCT CASE WHEN r.status = 'active' THEN r.equipment_id END) as currently_rented,
          COUNT(DISTINCT CASE WHEN r.status = 'returned' ${dateFilter.replace('OR r.status = \'active\'', '')} THEN r.equipment_id END) as returned_in_period,
          COUNT(DISTINCT CASE WHEN r.status IN ('active', 'returned') ${dateFilter} THEN r.equipment_id END) as total_rentals
        FROM equipment e
        LEFT JOIN rentals r ON e.id = r.equipment_id
        GROUP BY e.type
        ORDER BY total_equipment DESC
        LIMIT 10
      `;

      console.log('Equipment chart SQL:', sql);

      const [rows] = await db.execute(sql);

      console.log('Equipment chart raw data:', rows);
      console.log('Equipment chart data length:', rows.length);

      // Transform data to match frontend expectations
      const transformedData = rows.map(row => ({
        equipment_type: row.equipment_type,
        total_equipment: parseInt(row.total_equipment) || 0,
        currently_rented: parseInt(row.currently_rented) || 0,
        returned_count: parseInt(row.returned_in_period) || 0,
        total_rentals: parseInt(row.total_rentals) || 0
      }));

      console.log('Equipment chart transformed data:', transformedData);

      const endTime = performance.now();
      console.log(`Electron: Equipment chart data completed in ${endTime - startTime}ms for period ${period}`);

      return transformedData;
    } catch (error) {
      const endTime = performance.now();
      console.log(`Electron: Equipment chart data failed in ${endTime - startTime}ms - ${error.message}`);
      throw error;
    }
  });

  ipcMain.handle('db-get-payment-status-chart-data', async (event, period = 'all') => {
    console.log('Electron: Starting payment status chart data query for period:', period);
    const startTime = performance.now();
    try {
      let dateFilter = '';
  
      if (period !== 'all') {
        let periodStart, periodEnd;
        switch (period) {
          case 'weekly':
            periodStart = 'DATE_SUB(CURDATE(), INTERVAL 1 WEEK)';
            periodEnd = 'CURDATE()';
            break;
          case 'monthly':
            periodStart = 'DATE_SUB(CURDATE(), INTERVAL 1 MONTH)';
            periodEnd = 'CURDATE()';
            break;
          case 'yearly':
            periodStart = 'DATE_SUB(CURDATE(), INTERVAL 1 YEAR)';
            periodEnd = 'CURDATE()';
            break;
          default:
            periodStart = 'DATE_SUB(CURDATE(), INTERVAL 1 MONTH)';
            periodEnd = 'CURDATE()';
        }
        dateFilter = `WHERE start_date <= ${periodEnd} AND end_date >= ${periodStart}`;
      }
  
      // Get payment status distribution
      const sql = `
        SELECT
          payment_status,
          COUNT(*) as count,
          SUM(total_amount) as total_amount,
          ROUND(AVG(total_amount), 2) as avg_amount
        FROM rentals
        ${dateFilter}
        GROUP BY payment_status
        ORDER BY total_amount DESC
      `;
  
      console.log('Payment chart SQL:', sql);
  
      const [rows] = await db.execute(sql);
  
      const endTime = performance.now();
      console.log(`Electron: Payment status chart data completed in ${endTime - startTime}ms for period ${period}`);
  
      return rows;
    } catch (error) {
      const endTime = performance.now();
      console.log(`Electron: Payment status chart data failed in ${endTime - startTime}ms - ${error.message}`);
      throw error;
    }
  });

  // Reports handlers
  ipcMain.handle('db-get-equipment-utilization', async (event, options = {}) => {
    console.log('Electron: Starting equipment utilization report');
    const startTime = performance.now();
    try {
      const { startDate, endDate } = options;

      let dateFilter = '';
      let dateParams = [];
      if (startDate && endDate) {
        dateFilter = 'WHERE r.created_at BETWEEN ? AND ?';
        dateParams = [startDate + ' 00:00:00', endDate + ' 23:59:59'];
      }

      // Equipment utilization by type
      const [utilizationByType] = await db.execute(
        `SELECT
          e.type as equipment_type,
          COUNT(DISTINCT e.id) as total_equipment,
          COUNT(DISTINCT CASE WHEN r.status = 'active' THEN r.equipment_id END) as currently_rented,
          COUNT(DISTINCT CASE WHEN r.status = 'returned' THEN r.equipment_id END) as returned_count,
          ROUND(AVG(r.rate_per_hour), 2) as avg_hourly_rate,
          SUM(CASE WHEN r.status IN ('active', 'returned') THEN r.total_amount ELSE 0 END) as total_revenue
        FROM equipment e
        LEFT JOIN rentals r ON e.id = r.equipment_id
        ${dateFilter}
        GROUP BY e.type
        ORDER BY total_revenue DESC`,
        dateParams
      );

      // Equipment utilization over time (monthly)
      const [utilizationOverTime] = await db.execute(
        `SELECT
          DATE_FORMAT(r.created_at, '%Y-%m') as month,
          COUNT(r.id) as rentals_count,
          SUM(r.total_amount) as monthly_revenue,
          COUNT(DISTINCT r.equipment_id) as unique_equipment_used
        FROM rentals r
        ${dateFilter}
        GROUP BY DATE_FORMAT(r.created_at, '%Y-%m')
        ORDER BY month DESC
        LIMIT 12`,
        dateParams
      );

      // Most rented equipment
      const [mostRented] = await db.execute(
        `SELECT
          e.name as equipment_name,
          e.type as equipment_type,
          COUNT(r.id) as rental_count,
          SUM(r.total_amount) as total_revenue,
          AVG(r.rate_per_hour) as avg_rate,
          MAX(r.created_at) as last_rental_date
        FROM equipment e
        JOIN rentals r ON e.id = r.equipment_id
        ${dateFilter}
        GROUP BY e.id, e.name, e.type
        ORDER BY rental_count DESC
        LIMIT 10`,
        dateParams
      );

      const endTime = performance.now();
      console.log(`Electron: Equipment utilization report completed in ${endTime - startTime}ms`);

      return {
        utilizationByType,
        utilizationOverTime,
        mostRented,
        dateRange: { startDate, endDate }
      };
    } catch (error) {
      const endTime = performance.now();
      console.log(`Electron: Equipment utilization report failed in ${endTime - startTime}ms - ${error.message}`);
      throw error;
    }
  });

  ipcMain.handle('db-get-income-summary', async (event, options = {}) => {
    console.log('Electron: Starting income summary report');
    const startTime = performance.now();
    try {
      const { startDate, endDate } = options;

      let dateFilter = '';
      let dateParams = [];
      if (startDate && endDate) {
        dateFilter = 'WHERE r.created_at BETWEEN ? AND ?';
        dateParams = [startDate + ' 00:00:00', endDate + ' 23:59:59'];
      }

      // Overall income statistics
      const [overallStats] = await db.execute(`
        SELECT
          COUNT(r.id) as total_rentals,
          SUM(r.total_amount) as total_revenue,
          AVG(r.total_amount) as avg_rental_value,
          SUM(r.total_paid) as total_paid,
          SUM(r.total_amount - r.total_paid) as total_outstanding,
          COUNT(CASE WHEN r.payment_status = 'paid' THEN 1 END) as fully_paid_rentals,
          COUNT(CASE WHEN r.payment_status = 'partial' THEN 1 END) as partially_paid_rentals,
          COUNT(CASE WHEN r.payment_status = 'unpaid' THEN 1 END) as unpaid_rentals
        FROM rentals r
        ${dateFilter}
      `, dateParams);

      // Revenue by equipment type
      const [revenueByType] = await db.execute(`
        SELECT
          e.type as equipment_type,
          COUNT(r.id) as rental_count,
          SUM(r.total_amount) as total_revenue,
          AVG(r.total_amount) as avg_revenue_per_rental,
          SUM(r.total_paid) as total_paid,
          ROUND((SUM(r.total_paid) / SUM(r.total_amount)) * 100, 2) as payment_completion_rate
        FROM rentals r
        JOIN equipment e ON r.equipment_id = e.id
        ${dateFilter}
        GROUP BY e.type
        ORDER BY total_revenue DESC
      `, dateParams);

      // Monthly revenue trend
      const [monthlyRevenue] = await db.execute(`
        SELECT
          DATE_FORMAT(r.created_at, '%Y-%m') as month,
          COUNT(r.id) as rental_count,
          SUM(r.total_amount) as total_revenue,
          SUM(r.total_paid) as total_paid,
          AVG(r.total_amount) as avg_rental_value
        FROM rentals r
        ${dateFilter}
        GROUP BY DATE_FORMAT(r.created_at, '%Y-%m')
        ORDER BY month DESC
        LIMIT 12
      `, dateParams);

      // Payment status breakdown
      const [paymentStatus] = await db.execute(`
        SELECT
          r.payment_status,
          COUNT(*) as count,
          SUM(r.total_amount) as total_amount,
          SUM(r.total_paid) as total_paid,
          ROUND(AVG(r.total_amount), 2) as avg_amount
        FROM rentals r
        ${dateFilter}
        GROUP BY r.payment_status
        ORDER BY total_amount DESC
      `, dateParams);

      const endTime = performance.now();
      console.log(`Electron: Income summary report completed in ${endTime - startTime}ms`);

      return {
        overallStats: overallStats[0],
        revenueByType,
        monthlyRevenue,
        paymentStatus,
        dateRange: { startDate, endDate }
      };
    } catch (error) {
      const endTime = performance.now();
      console.log(`Electron: Income summary report failed in ${endTime - startTime}ms - ${error.message}`);
      throw error;
    }
  });

  ipcMain.handle('db-get-overdue-rentals-report', async (event, options = {}) => {
    console.log('Electron: Starting overdue rentals report');
    const startTime = performance.now();
    try {
      const { startDate, endDate } = options;

      let dateFilter = '';
      let dateParams = [];
      if (startDate && endDate) {
        dateFilter = 'AND r.created_at BETWEEN ? AND ?';
        dateParams = [startDate + ' 00:00:00', endDate + ' 23:59:59'];
      }

      // Overdue rentals
      const [overdueRentals] = await db.execute(`
        SELECT
          r.*,
          c.name as client_name,
          c.contact_number,
          c.email,
          e.name as equipment_name,
          e.type as equipment_type,
          DATEDIFF(CURDATE(), r.end_date) as days_overdue,
          (DATEDIFF(CURDATE(), r.end_date) * r.rate_per_hour) as overdue_charges,
          r.total_amount - r.total_paid as outstanding_amount
        FROM rentals r
        JOIN clients c ON r.client_id = c.id
        JOIN equipment e ON r.equipment_id = e.id
        WHERE r.status = 'active'
        AND r.end_date < CURDATE()
        ${dateFilter}
        ORDER BY days_overdue DESC
      `, dateParams);

      // Overdue summary statistics
      const [overdueSummary] = await db.execute(`
        SELECT
          COUNT(*) as total_overdue,
          SUM(DATEDIFF(CURDATE(), r.end_date)) as total_overdue_days,
          SUM(DATEDIFF(CURDATE(), r.end_date) * r.rate_per_hour) as total_overdue_charges,
          SUM(r.total_amount - r.total_paid) as total_outstanding,
          AVG(DATEDIFF(CURDATE(), r.end_date)) as avg_days_overdue,
          MAX(DATEDIFF(CURDATE(), r.end_date)) as max_days_overdue
        FROM rentals r
        WHERE r.status = 'active'
        AND r.end_date < CURDATE()
        ${dateFilter}
      `, dateParams);

      // Overdue by equipment type
      const [overdueByType] = await db.execute(`
        SELECT
          e.type as equipment_type,
          COUNT(*) as overdue_count,
          SUM(DATEDIFF(CURDATE(), r.end_date)) as total_overdue_days,
          SUM(DATEDIFF(CURDATE(), r.end_date) * r.rate_per_hour) as total_charges
        FROM rentals r
        JOIN equipment e ON r.equipment_id = e.id
        WHERE r.status = 'active'
        AND r.end_date < CURDATE()
        ${dateFilter}
        GROUP BY e.type
        ORDER BY overdue_count DESC
      `, dateParams);

      const endTime = performance.now();
      console.log(`Electron: Overdue rentals report completed in ${endTime - startTime}ms`);

      return {
        overdueRentals,
        overdueSummary: overdueSummary[0],
        overdueByType,
        dateRange: { startDate, endDate }
      };
    } catch (error) {
      const endTime = performance.now();
      console.log(`Electron: Overdue rentals report failed in ${endTime - startTime}ms - ${error.message}`);
      throw error;
    }
  });

  ipcMain.handle('db-get-damage-logs-report', async (event, options = {}) => {
    console.log('Electron: Starting damage logs report');
    const startTime = performance.now();
    try {
      const { startDate, endDate } = options;

      let dateFilter = '';
      let dateParams = [];
      if (startDate && endDate) {
        dateFilter = 'WHERE ret.created_at BETWEEN ? AND ?';
        dateParams = [startDate + ' 00:00:00', endDate + ' 23:59:59'];
      }

      // Damage logs
      const [damageLogs] = await db.execute(
        `SELECT
          ret.*,
          r.client_id,
          c.name as client_name,
          c.contact_number,
          e.name as equipment_name,
          e.type as equipment_type,
          r.start_date,
          r.end_date,
          r.rate_per_hour,
          r.total_amount
        FROM returns ret
        JOIN rentals r ON ret.rental_id = r.id
        JOIN clients c ON r.client_id = c.id
        JOIN equipment e ON r.equipment_id = e.id
        WHERE ret.condition = 'damaged'
        ${dateFilter}
        ORDER BY ret.created_at DESC`,
        dateParams
      );

      // Damage summary statistics
      const [damageSummary] = await db.execute(`
        SELECT
          COUNT(*) as total_damaged_returns,
          SUM(ret.additional_charges) as total_damage_costs,
          AVG(ret.additional_charges) as avg_damage_cost,
          COUNT(CASE WHEN ret.additional_charges > 0 THEN 1 END) as returns_with_charges,
          SUM(CASE WHEN ret.additional_charges > 0 THEN ret.additional_charges ELSE 0 END) as total_charges_applied
        FROM returns ret
        WHERE ret.condition = 'damaged'
        ${dateFilter}
      `, dateParams);

      // Damage by equipment type
      const [damageByType] = await db.execute(`
        SELECT
          e.type as equipment_type,
          COUNT(*) as damage_count,
          SUM(ret.additional_charges) as total_cost,
          AVG(ret.additional_charges) as avg_cost,
          COUNT(CASE WHEN ret.additional_charges > 0 THEN 1 END) as with_charges
        FROM returns ret
        JOIN rentals r ON ret.rental_id = r.id
        JOIN equipment e ON r.equipment_id = e.id
        WHERE ret.condition = 'damaged'
        ${dateFilter}
        GROUP BY e.type
        ORDER BY damage_count DESC
      `, dateParams);

      // Equipment maintenance status
      const [maintenanceStatus] = await db.execute(`
        SELECT
          e.name as equipment_name,
          e.type as equipment_type,
          e.status,
          COUNT(ret.id) as damage_incidents,
          MAX(ret.created_at) as last_damage_date,
          SUM(ret.additional_charges) as total_repair_costs
        FROM equipment e
        LEFT JOIN rentals r ON e.id = r.equipment_id
        LEFT JOIN returns ret ON r.id = ret.rental_id AND ret.condition = 'damaged'
        GROUP BY e.id, e.name, e.type, e.status
        HAVING damage_incidents > 0
        ORDER BY damage_incidents DESC
      `);

      const endTime = performance.now();
      console.log(`Electron: Damage logs report completed in ${endTime - startTime}ms`);

      return {
        damageLogs,
        damageSummary: damageSummary[0],
        damageByType,
        maintenanceStatus,
        dateRange: { startDate, endDate }
      };
    } catch (error) {
      const endTime = performance.now();
      console.log(`Electron: Damage logs report failed in ${endTime - startTime}ms - ${error.message}`);
      throw error;
    }
  });

  // Custom report generation handler
  ipcMain.handle('db-generate-custom-report', async (event, reportConfig) => {
    console.log('Electron: Starting custom report generation');
    const startTime = performance.now();

    try {
      const { dataSources, filters, elements } = reportConfig;

      // Build dynamic query based on selected data sources and filters
      let query = 'SELECT ';
      let joins = [];
      let whereConditions = [];
      let params = [];

      // Determine main table and build query
      let mainTable = 'rentals'; // Default to rentals as it connects most tables
      const tableAliases = {
        clients: 'c',
        equipment: 'e',
        rentals: 'r',
        payments: 'p',
        returns: 'ret'
      };

      // If only clients is selected, make clients the main table
      if (dataSources.length === 1 && dataSources[0].id === 'clients') {
        mainTable = 'clients';
      }

      // Build SELECT clause
      const selectFields = [];
      dataSources.forEach(ds => {
        const alias = tableAliases[ds.id];
        // Only include fields that exist in the current query context
        ds.fields.forEach(field => {
          // Check if this table is actually joined in the query
          const tableInQuery = ds.id === mainTable || joins.some(join => join.includes(`${ds.id} ${alias}`));
          if (tableInQuery || (ds.id === 'equipment' && mainTable === 'clients' && joins.some(join => join.includes('rentals r_temp')))) {
            selectFields.push(`${alias}.${field} as ${ds.id}_${field}`);
          }
        });
      });

      // Special case: For equipment bar charts, ensure equipment name field is included
      if (dataSources.some(ds => ds.id === 'equipment') && dataSources.some(ds => ds.id === 'rentals')) {
        const equipmentAlias = tableAliases['equipment'];
        const rentalsAlias = tableAliases['rentals'];
        if (!selectFields.some(field => field.includes(`${equipmentAlias}.name`))) {
          selectFields.push(`${equipmentAlias}.name as equipment_name`);
        }
        if (!selectFields.some(field => field.includes(`${rentalsAlias}.id`))) {
          selectFields.push(`${rentalsAlias}.id as rentals_id`);
        }
      }

      // If no fields selected, add a default field
      if (selectFields.length === 0) {
        const mainAlias = tableAliases[mainTable];
        selectFields.push(`${mainAlias}.id as ${mainTable}_id`);
      }

      query += selectFields.join(', ');

      // Build FROM and JOIN clauses
      query += ` FROM ${mainTable} ${tableAliases[mainTable]}`;

      // Add joins for other data sources
      dataSources.filter(ds => ds.id !== mainTable).forEach(ds => {
        const alias = tableAliases[ds.id];
        let joinCondition = '';

        if (ds.id === 'clients' && mainTable === 'rentals') {
          joinCondition = `${alias}.id = ${tableAliases[mainTable]}.client_id`;
        } else if (ds.id === 'equipment' && mainTable === 'rentals') {
          joinCondition = `${alias}.id = ${tableAliases[mainTable]}.equipment_id`;
        } else if (ds.id === 'payments' && mainTable === 'rentals') {
          joinCondition = `${alias}.rental_id = ${tableAliases[mainTable]}.id`;
        } else if (ds.id === 'returns' && mainTable === 'rentals') {
          joinCondition = `${alias}.rental_id = ${tableAliases[mainTable]}.id`;
        } else if (ds.id === 'rentals' && mainTable === 'clients') {
          joinCondition = `${alias}.client_id = ${tableAliases[mainTable]}.id`;
        } else if (ds.id === 'equipment' && mainTable === 'clients') {
          // Need to join through rentals
          joins.push(`LEFT JOIN rentals r_temp ON r_temp.client_id = ${tableAliases[mainTable]}.id`);
          joinCondition = `${alias}.id = r_temp.equipment_id`;
        }

        if (joinCondition) {
          joins.push(`LEFT JOIN ${ds.id} ${alias} ON ${joinCondition}`);
        }
      });

      query += ' ' + joins.join(' ');

      // Build WHERE clause from filters
      filters.forEach(filter => {
        if (filter.type === 'date_range' && filter.value.start && filter.value.end) {
          // Use appropriate table for date filtering
          const dateTable = mainTable === 'clients' ? 'r_temp' : 'r';
          whereConditions.push(`${dateTable}.created_at BETWEEN ? AND ?`);
          params.push(filter.value.start + ' 00:00:00', filter.value.end + ' 23:59:59');
        } else if (filter.type === 'amount_range') {
          if (filter.value.min) {
            whereConditions.push('r.total_amount >= ?');
            params.push(filter.value.min);
          }
          if (filter.value.max) {
            whereConditions.push('r.total_amount <= ?');
            params.push(filter.value.max);
          }
        } else if (filter.type === 'status_filter' && filter.value.length > 0) {
          whereConditions.push(`r.status IN (${filter.value.map(() => '?').join(',')})`);
          params.push(...filter.value);
        } else if (filter.type === 'text_search' && filter.value) {
          whereConditions.push('(c.name LIKE ? OR e.name LIKE ?)');
          params.push(`%${filter.value}%`, `%${filter.value}%`);
        }
      });

      if (whereConditions.length > 0) {
        query += ' WHERE ' + whereConditions.join(' AND ');
      }

      // Order by appropriate field based on main table
      const orderField = mainTable === 'clients' ? 'c.created_at' : 'r.created_at';
      query += ` ORDER BY ${orderField} DESC LIMIT 1000`; // Limit for performance

      console.log('Generated custom query:', query);
      console.log('Query params:', params);

      const [rows] = await db.execute(query, params);

      const endTime = performance.now();
      console.log(`Electron: Custom report generated in ${endTime - startTime}ms, returned ${rows.length} records`);

      return {
        data: rows,
        query,
        recordCount: rows.length,
        dataSources: dataSources.map(ds => ds.name),
        filters: filters.map(f => f.name)
      };
    } catch (error) {
      const endTime = performance.now();
      console.log(`Electron: Custom report generation failed in ${endTime - startTime}ms - ${error.message}`);
      throw error;
    }
  });

  // Export handlers
  ipcMain.handle('db-export-report-pdf', async (event, reportType, reportData, dateRange) => {
    console.log('Electron: Starting PDF export for report:', reportType);
    const startTime = performance.now();

    try {
      const { filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Save PDF Report',
        defaultPath: `${reportType}-report-${new Date().toISOString().split('T')[0]}.pdf`,
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
      });

      if (!filePath) return null;

      const doc = new PDFDocument();
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Header
      doc.fontSize(20).text('Rent and Return System - Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(16).text(getReportTitle(reportType), { align: 'center' });
      doc.moveDown();

      // Date range
      if (dateRange.startDate && dateRange.endDate) {
        doc.fontSize(12).text(`Report Period: ${dateRange.startDate} to ${dateRange.endDate}`, { align: 'center' });
      } else {
        doc.fontSize(12).text('Report Period: All Time', { align: 'center' });
      }
      doc.moveDown(2);

      // Generate report content based on type
      await generatePDFContent(doc, reportType, reportData);

      // Footer
      doc.moveDown(2);
      doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });

      doc.end();

      return new Promise((resolve, reject) => {
        stream.on('finish', () => {
          const endTime = performance.now();
          console.log(`Electron: PDF export completed in ${endTime - startTime}ms`);
          resolve(filePath);
        });
        stream.on('error', reject);
      });
    } catch (error) {
      const endTime = performance.now();
      console.log(`Electron: PDF export failed in ${endTime - startTime}ms - ${error.message}`);
      throw error;
    }
  });

  ipcMain.handle('db-export-report-excel', async (event, reportType, reportData, dateRange) => {
    console.log('Electron: Starting Excel export for report:', reportType);
    const startTime = performance.now();

    try {
      const { filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Save Excel Report',
        defaultPath: `${reportType}-report-${new Date().toISOString().split('T')[0]}.xlsx`,
        filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
      });

      if (!filePath) return null;

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Rent and Return System';
      workbook.created = new Date();

      // Create worksheet
      const worksheet = workbook.addWorksheet(getReportTitle(reportType));

      // Generate Excel content based on type
      await generateExcelContent(worksheet, reportType, reportData, dateRange);

      // Save file
      await workbook.xlsx.writeFile(filePath);

      const endTime = performance.now();
      console.log(`Electron: Excel export completed in ${endTime - startTime}ms`);
      return filePath;
    } catch (error) {
      const endTime = performance.now();
      console.log(`Electron: Excel export failed in ${endTime - startTime}ms - ${error.message}`);
      throw error;
    }
  });
}

async function initDatabase() {
  try {
    const connectionConfig = { ...dbConfig };
    console.log('Electron: Database config:', { ...connectionConfig, password: '***' });

    console.log('Attempting to connect to MySQL database...');
    db = await mysql.createConnection(connectionConfig);
    console.log('✅ Connected to MySQL database successfully');

    await createTables();
    console.log('✅ Database tables created/verified');

    await db.execute('SELECT 1');
    console.log('✅ Database connection test successful');

    registerIPCHandlers();
    console.log('✅ IPC handlers registered');
    console.log('Electron: Available IPC handlers:', ipcMain.eventNames().filter(name => name.startsWith('db-')));
    console.log('Electron: All IPC handlers:', ipcMain.eventNames());

  } catch (err) {
    console.error('❌ Error connecting to MySQL database:', err.message);

    if (err.code === 'ER_BAD_DB_ERROR') {
      console.log('Database does not exist, attempting to create it...');
      try {
        const tempConnection = await mysql.createConnection({
          host: dbConfig.host,
          user: dbConfig.user,
          password: dbConfig.password,
          port: dbConfig.port,
          connectTimeout: 60000,
        });

        await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await tempConnection.end();
        console.log('✅ Database created successfully');

        const retryConfig = { ...dbConfig };

        db = await mysql.createConnection(retryConfig);
        console.log('✅ Connected to MySQL database successfully');
        await createTables();
        console.log('✅ Database tables created/verified');

        registerIPCHandlers();
        console.log('✅ IPC handlers registered');

      } catch (createErr) {
        console.error('❌ Error creating database:', createErr.message);
        throw createErr;
      }
    } else {
      throw err;
    }
  }
}

async function createTables() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(250) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('admin', 'staff') NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS clients (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      contact_number VARCHAR(255),
      email VARCHAR(255),
      project_site VARCHAR(255),
      address TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS equipment (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(255) NOT NULL,
      rate_per_hour DECIMAL(10,2) NOT NULL,
      \`status\` ENUM('available', 'rented', 'maintenance') NOT NULL,
      description TEXT,
      quantity_total INT NOT NULL DEFAULT 1,
      quantity_available INT NOT NULL DEFAULT 1,
      maintenance_quantity INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS rentals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      client_id INT NOT NULL,
      equipment_id INT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      rate_per_hour DECIMAL(10,2) NOT NULL,
      total_amount DECIMAL(10,2) NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      \`status\` ENUM('active', 'returned', 'overdue') NOT NULL,
      payment_status ENUM('unpaid', 'partial', 'paid') NOT NULL DEFAULT 'unpaid',
      total_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
      overnight_custody ENUM('owner', 'client') NOT NULL DEFAULT 'owner',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients (id),
      FOREIGN KEY (equipment_id) REFERENCES equipment (id)
    )`,

    `CREATE TABLE IF NOT EXISTS payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      rental_id INT NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      payment_type ENUM('full', 'partial') NOT NULL,
      payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (rental_id) REFERENCES rentals (id)
    )`,

    `CREATE TABLE IF NOT EXISTS returns (
      id INT AUTO_INCREMENT PRIMARY KEY,
      rental_id INT NOT NULL,
      return_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`condition\` ENUM('good', 'damaged', 'lost') NOT NULL,
      damage_description TEXT,
      additional_charges DECIMAL(10,2) DEFAULT 0,
      damaged_count INT DEFAULT 1,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (rental_id) REFERENCES rentals (id)
    )`,

    `CREATE TABLE IF NOT EXISTS audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      action VARCHAR(255) NOT NULL,
      table_name VARCHAR(255) NOT NULL,
      record_id INT,
      old_values TEXT,
      new_values TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`
  ];

  for (let i = 0; i < tables.length; i++) {
    const sql = tables[i];
    try {
      console.log(`Creating table ${i + 1}/${tables.length}...`);
      console.log('SQL:', sql.substring(0, 100) + (sql.length > 100 ? '...' : ''));
      await db.execute(sql);
      console.log(`✅ Table ${i + 1} created successfully`);
    } catch (err) {
      console.error(`❌ Error creating table ${i + 1}:`, err.message);
      console.error('Full SQL:', sql);
      // Continue with other tables to see if others fail too
    }
  }

  await migrateSchema();

  try {
    const [rows] = await db.execute("SELECT COUNT(*) as count FROM users");
    if (rows[0].count === 0) {
      const hashedPassword = bcrypt.hashSync('admin123', 10);

      await db.execute(
        "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
        ['admin', hashedPassword, 'admin']
      );
      console.log('Default admin user created (username: admin, password: admin123)');
    }
  } catch (err) {
    console.error('Error checking users:', err.message);
  }
}

async function migrateSchema() {
  try {
    const [equipmentColumns] = await db.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'equipment'
    `);

    const colNames = equipmentColumns.map(row => row.COLUMN_NAME);

    // Rename rate_per_day to rate_per_hour if it exists
    if (colNames.includes('rate_per_day') && !colNames.includes('rate_per_hour')) {
      await db.execute(`ALTER TABLE equipment CHANGE rate_per_day rate_per_hour DECIMAL(10,2) NOT NULL`);
    }

    if (!colNames.includes('quantity_total')) {
      await db.execute(`ALTER TABLE equipment ADD COLUMN quantity_total INT NOT NULL DEFAULT 1`);
    }
    if (!colNames.includes('quantity_available')) {
      await db.execute(`ALTER TABLE equipment ADD COLUMN quantity_available INT NOT NULL DEFAULT 1`);
    }
    if (!colNames.includes('maintenance_quantity')) {
      await db.execute(`ALTER TABLE equipment ADD COLUMN maintenance_quantity INT NOT NULL DEFAULT 0`);
    }

    await db.execute(`UPDATE equipment SET quantity_total = COALESCE(quantity_total, 1)`);
    await db.execute(`UPDATE equipment SET quantity_available = COALESCE(quantity_available, quantity_total)`);
    await db.execute(`UPDATE equipment SET maintenance_quantity = COALESCE(maintenance_quantity, 0)`);

    // Migrate old maintenance status to maintenance_quantity
    await db.execute(`UPDATE equipment SET maintenance_quantity = quantity_total - quantity_available WHERE status = 'maintenance'`);
    await db.execute(`UPDATE equipment SET status = CASE WHEN quantity_available > 0 THEN 'available' ELSE 'rented' END`);

    const [rentalColumns] = await db.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rentals'
    `);

    const rentalColNames = rentalColumns.map(row => row.COLUMN_NAME);

    // Rename rate_per_day to rate_per_hour if it exists
    if (rentalColNames.includes('rate_per_day') && !rentalColNames.includes('rate_per_hour')) {
      await db.execute(`ALTER TABLE rentals CHANGE rate_per_day rate_per_hour DECIMAL(10,2) NOT NULL`);
    }

    if (!rentalColNames.includes('quantity')) {
      await db.execute(`ALTER TABLE rentals ADD COLUMN quantity INT NOT NULL DEFAULT 1`);
    }

    if (!rentalColNames.includes('payment_status')) {
      await db.execute(`ALTER TABLE rentals ADD COLUMN payment_status ENUM('unpaid', 'partial', 'paid') NOT NULL DEFAULT 'unpaid'`);
    }

    if (!rentalColNames.includes('total_paid')) {
      await db.execute(`ALTER TABLE rentals ADD COLUMN total_paid DECIMAL(10,2) NOT NULL DEFAULT 0`);
    }

    if (!rentalColNames.includes('overnight_custody')) {
      await db.execute(`ALTER TABLE rentals ADD COLUMN overnight_custody ENUM('owner', 'client') NOT NULL DEFAULT 'owner'`);
    }

    await db.execute(`UPDATE rentals SET quantity = COALESCE(quantity, 1)`);
    await db.execute(`UPDATE rentals SET payment_status = COALESCE(payment_status, 'unpaid')`);
    await db.execute(`UPDATE rentals SET total_paid = COALESCE(total_paid, 0)`);
    await db.execute(`UPDATE rentals SET overnight_custody = COALESCE(overnight_custody, 'owner')`);

    const [returnColumns] = await db.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'returns'
    `);

    const returnColNames = returnColumns.map(row => row.COLUMN_NAME);

    if (!returnColNames.includes('damaged_count')) {
      await db.execute(`ALTER TABLE returns ADD COLUMN damaged_count INT DEFAULT 1`);
    }
  } catch (e) {
    console.error('Migration error:', e);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false
    },
    icon: path.join(__dirname, 'icon.ico'),
    show: false
  });

  const startUrl = process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

let isDatabaseReady = false;

app.whenReady().then(async () => {
  try {
    await initDatabase();
    isDatabaseReady = true;
    console.log('Database initialized successfully');

    createWindow();

    // Notify renderer that database is ready after window creation
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('database-ready');
      }
    }, 100); // Reduced from 1000ms to 100ms

  } catch (error) {
    console.error('Failed to initialize database:', error);
    createWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

const template = [
  {
    label: 'File',
    submenu: [
      {
        label: 'Exit',
        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
        click: () => {
          app.quit();
        }
      }
    ]
  },
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' }
    ]
  },
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  }
];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);
