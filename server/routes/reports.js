const express = require('express');
const router = express.Router();
const { getDatabase } = require('../models/database');
const ExcelJS = require('exceljs');

// Get comprehensive business summary
router.get('/business-summary', (req, res) => {
  const db = getDatabase();
  const { startDate, endDate } = req.query;
  
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Start date and end date are required' });
  }
  
  // Get sales summary
  const salesQuery = `
    SELECT 
      COUNT(*) as total_sales,
      SUM(final_amount) as total_revenue,
      AVG(final_amount) as average_sale,
      SUM(CASE WHEN payment_method = 'cash' THEN final_amount ELSE 0 END) as cash_revenue,
      SUM(CASE WHEN payment_method = 'gcash' THEN final_amount ELSE 0 END) as gcash_revenue,
      SUM(CASE WHEN payment_method = 'credit' THEN final_amount ELSE 0 END) as credit_revenue
    FROM sales 
    WHERE DATE(created_at) BETWEEN ? AND ? AND payment_status = 'completed'
  `;
  
  // Get top selling products
  const topProductsQuery = `
    SELECT 
      p.name as product_name,
      p.barcode,
      c.name as category_name,
      SUM(si.quantity) as total_quantity_sold,
      SUM(si.total_price) as total_revenue,
      AVG(si.unit_price) as average_price
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    JOIN sales s ON si.sale_id = s.id
    WHERE DATE(s.created_at) BETWEEN ? AND ? AND s.payment_status = 'completed'
    GROUP BY p.id, p.name, p.barcode, c.name
    ORDER BY total_quantity_sold DESC
    LIMIT 10
  `;
  
  // Get inventory summary
  const inventoryQuery = `
    SELECT 
      COUNT(*) as total_products,
      SUM(stock_quantity) as total_stock,
      SUM(stock_quantity * cost_price) as inventory_value,
      SUM(CASE WHEN stock_quantity <= min_stock_level THEN 1 ELSE 0 END) as low_stock_count
    FROM products 
    WHERE is_active = 1
  `;
  
  // Get credit summary
  const creditQuery = `
    SELECT 
      COUNT(*) as total_customers,
      COUNT(CASE WHEN current_balance > 0 THEN 1 END) as customers_with_credit,
      SUM(current_balance) as total_outstanding_credit
    FROM customers 
    WHERE is_active = 1
  `;
  
  db.get(salesQuery, [startDate, endDate], (err, salesSummary) => {
    if (err) {
      console.error('Error fetching sales summary:', err);
      return res.status(500).json({ error: 'Failed to fetch sales summary' });
    }
    
    db.all(topProductsQuery, [startDate, endDate], (err, topProducts) => {
      if (err) {
        console.error('Error fetching top products:', err);
        return res.status(500).json({ error: 'Failed to fetch top products' });
      }
      
      db.get(inventoryQuery, (err, inventorySummary) => {
        if (err) {
          console.error('Error fetching inventory summary:', err);
          return res.status(500).json({ error: 'Failed to fetch inventory summary' });
        }
        
        db.get(creditQuery, (err, creditSummary) => {
          if (err) {
            console.error('Error fetching credit summary:', err);
            return res.status(500).json({ error: 'Failed to fetch credit summary' });
          }
          
          res.json({
            period: { startDate, endDate },
            sales: salesSummary,
            topProducts,
            inventory: inventorySummary,
            credit: creditSummary
          });
        });
      });
    });
  });
});

// Get profit and loss report
router.get('/profit-loss', (req, res) => {
  const db = getDatabase();
  const { startDate, endDate } = req.query;
  
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Start date and end date are required' });
  }
  
  const query = `
    SELECT 
      p.name as product_name,
      p.barcode,
      c.name as category_name,
      SUM(si.quantity) as quantity_sold,
      SUM(si.total_price) as revenue,
      SUM(si.quantity * p.cost_price) as cost_of_goods,
      SUM(si.total_price - (si.quantity * p.cost_price)) as gross_profit,
      ROUND(
        ((si.total_price - (si.quantity * p.cost_price)) / si.total_price) * 100, 2
      ) as profit_margin
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    JOIN sales s ON si.sale_id = s.id
    WHERE DATE(s.created_at) BETWEEN ? AND ? AND s.payment_status = 'completed'
    GROUP BY p.id, p.name, p.barcode, c.name
    ORDER BY gross_profit DESC
  `;
  
  db.all(query, [startDate, endDate], (err, profitLoss) => {
    if (err) {
      console.error('Error fetching profit and loss:', err);
      return res.status(500).json({ error: 'Failed to fetch profit and loss report' });
    }
    
    // Calculate totals
    const totals = profitLoss.reduce((acc, item) => {
      acc.totalRevenue += parseFloat(item.revenue);
      acc.totalCost += parseFloat(item.cost_of_goods);
      acc.totalProfit += parseFloat(item.gross_profit);
      return acc;
    }, { totalRevenue: 0, totalCost: 0, totalProfit: 0 });
    
    totals.profitMargin = totals.totalRevenue > 0 ? 
      ((totals.totalProfit / totals.totalRevenue) * 100).toFixed(2) : 0;
    
    res.json({
      period: { startDate, endDate },
      items: profitLoss,
      totals
    });
  });
});

// Get sales by date (for charts)
router.get('/sales-by-date', (req, res) => {
  const db = getDatabase();
  const { startDate, endDate } = req.query;
  
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Start date and end date are required' });
  }
  
  const query = `
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as total_sales,
      SUM(final_amount) as total_revenue,
      AVG(final_amount) as average_sale,
      SUM(CASE WHEN payment_method = 'cash' THEN final_amount ELSE 0 END) as cash_sales,
      SUM(CASE WHEN payment_method = 'gcash' THEN final_amount ELSE 0 END) as gcash_sales,
      SUM(CASE WHEN payment_method = 'credit' THEN final_amount ELSE 0 END) as credit_sales
    FROM sales 
    WHERE DATE(created_at) BETWEEN ? AND ? AND payment_status = 'completed'
    GROUP BY DATE(created_at)
    ORDER BY date
  `;
  
  db.all(query, [startDate, endDate], (err, salesByDate) => {
    if (err) {
      console.error('Error fetching sales by date:', err);
      return res.status(500).json({ error: 'Failed to fetch sales by date' });
    }
    
    res.json(salesByDate);
  });
});

// Get top customers
router.get('/top-customers', (req, res) => {
  const db = getDatabase();
  const { startDate, endDate, limit = 10 } = req.query;
  
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Start date and end date are required' });
  }
  
  const query = `
    SELECT 
      c.name as customer_name,
      c.phone,
      c.email,
      COUNT(s.id) as total_purchases,
      SUM(s.final_amount) as total_spent,
      AVG(s.final_amount) as average_purchase,
      MAX(s.created_at) as last_purchase_date
    FROM customers c
    JOIN sales s ON c.id = s.customer_id
    WHERE DATE(s.created_at) BETWEEN ? AND ? AND s.payment_status = 'completed'
    GROUP BY c.id, c.name, c.phone, c.email
    ORDER BY total_spent DESC
    LIMIT ?
  `;
  
  db.all(query, [startDate, endDate, parseInt(limit)], (err, topCustomers) => {
    if (err) {
      console.error('Error fetching top customers:', err);
      return res.status(500).json({ error: 'Failed to fetch top customers' });
    }
    
    res.json(topCustomers);
  });
});

// Export sales report to Excel
router.get('/export/sales', async (req, res) => {
  const db = getDatabase();
  const { startDate, endDate } = req.query;
  
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Start date and end date are required' });
  }
  
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');
    
    // Add headers
    worksheet.columns = [
      { header: 'Sale Number', key: 'sale_number', width: 20 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Customer', key: 'customer_name', width: 25 },
      { header: 'Items', key: 'items_count', width: 10 },
      { header: 'Total Amount', key: 'total_amount', width: 15 },
      { header: 'Payment Method', key: 'payment_method', width: 15 },
      { header: 'Status', key: 'payment_status', width: 12 },
      { header: 'Cashier', key: 'cashier_name', width: 20 }
    ];
    
    // Get sales data
    const query = `
      SELECT 
        s.sale_number,
        s.created_at,
        c.name as customer_name,
        COUNT(si.id) as items_count,
        s.final_amount,
        s.payment_method,
        s.payment_status,
        u.full_name as cashier_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON s.cashier_id = u.id
      LEFT JOIN sale_items si ON s.id = si.sale_id
      WHERE DATE(s.created_at) BETWEEN ? AND ?
      GROUP BY s.id, s.sale_number, s.created_at, c.name, s.final_amount, s.payment_method, s.payment_status, u.full_name
      ORDER BY s.created_at DESC
    `;
    
    db.all(query, [startDate, endDate], (err, sales) => {
      if (err) {
        console.error('Error fetching sales for export:', err);
        return res.status(500).json({ error: 'Failed to fetch sales data' });
      }
      
      // Add data rows
      sales.forEach(sale => {
        worksheet.addRow({
          sale_number: sale.sale_number,
          date: new Date(sale.created_at).toLocaleDateString(),
          customer_name: sale.customer_name || 'Walk-in Customer',
          items_count: sale.items_count,
          total_amount: parseFloat(sale.final_amount).toFixed(2),
          payment_method: sale.payment_method,
          payment_status: sale.payment_status,
          cashier_name: sale.cashier_name || 'System'
        });
      });
      
      // Add summary row
      const totalRevenue = sales.reduce((sum, sale) => sum + parseFloat(sale.final_amount), 0);
      worksheet.addRow({
        sale_number: 'TOTAL',
        date: '',
        customer_name: '',
        items_count: sales.length,
        total_amount: totalRevenue.toFixed(2),
        payment_method: '',
        payment_status: '',
        cashier_name: ''
      });
      
      // Style the summary row
      const summaryRow = worksheet.getRow(worksheet.rowCount);
      summaryRow.font = { bold: true };
      summaryRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      
      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=sales-report-${startDate}-to-${endDate}.xlsx`);
      
      // Write to response
      workbook.xlsx.write(res).then(() => {
        res.end();
      });
    });
  } catch (error) {
    console.error('Error creating Excel file:', error);
    res.status(500).json({ error: 'Failed to create Excel file' });
  }
});

// Export inventory report to Excel
router.get('/export/inventory', async (req, res) => {
  const db = getDatabase();
  
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Inventory Report');
    
    // Add headers
    worksheet.columns = [
      { header: 'Product Name', key: 'name', width: 30 },
      { header: 'Barcode', key: 'barcode', width: 20 },
      { header: 'Category', key: 'category_name', width: 20 },
      { header: 'Stock Quantity', key: 'stock_quantity', width: 15 },
      { header: 'Min Stock Level', key: 'min_stock_level', width: 15 },
      { header: 'Unit Price', key: 'price', width: 15 },
      { header: 'Cost Price', key: 'cost_price', width: 15 },
      { header: 'Inventory Value', key: 'inventory_value', width: 15 },
      { header: 'Status', key: 'status', width: 15 }
    ];
    
    // Get inventory data
    const query = `
      SELECT 
        p.name,
        p.barcode,
        c.name as category_name,
        p.stock_quantity,
        p.min_stock_level,
        p.price,
        p.cost_price,
        (p.stock_quantity * p.cost_price) as inventory_value,
        CASE 
          WHEN p.stock_quantity = 0 THEN 'Out of Stock'
          WHEN p.stock_quantity <= p.min_stock_level THEN 'Low Stock'
          ELSE 'In Stock'
        END as status
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1
      ORDER BY p.name
    `;
    
    db.all(query, (err, inventory) => {
      if (err) {
        console.error('Error fetching inventory for export:', err);
        return res.status(500).json({ error: 'Failed to fetch inventory data' });
      }
      
      // Add data rows
      inventory.forEach(item => {
        worksheet.addRow({
          name: item.name,
          barcode: item.barcode || '',
          category_name: item.category_name || 'Uncategorized',
          stock_quantity: item.stock_quantity,
          min_stock_level: item.min_stock_level,
          price: parseFloat(item.price).toFixed(2),
          cost_price: parseFloat(item.cost_price).toFixed(2),
          inventory_value: parseFloat(item.inventory_value).toFixed(2),
          status: item.status
        });
      });
      
      // Add summary row
      const totalValue = inventory.reduce((sum, item) => sum + parseFloat(item.inventory_value), 0);
      const lowStockCount = inventory.filter(item => item.status === 'Low Stock').length;
      const outOfStockCount = inventory.filter(item => item.status === 'Out of Stock').length;
      
      worksheet.addRow({
        name: 'SUMMARY',
        barcode: '',
        category_name: '',
        stock_quantity: inventory.length,
        min_stock_level: '',
        price: '',
        cost_price: '',
        inventory_value: totalValue.toFixed(2),
        status: `${lowStockCount} low stock, ${outOfStockCount} out of stock`
      });
      
      // Style the summary row
      const summaryRow = worksheet.getRow(worksheet.rowCount);
      summaryRow.font = { bold: true };
      summaryRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      
      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=inventory-report.xlsx');
      
      // Write to response
      workbook.xlsx.write(res).then(() => {
        res.end();
      });
    });
  } catch (error) {
    console.error('Error creating Excel file:', error);
    res.status(500).json({ error: 'Failed to create Excel file' });
  }
});

module.exports = router;
