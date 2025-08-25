const express = require('express');
const router = express.Router();
const { getDatabase } = require('../models/database');
const { generateSalesNotification } = require('../utils/notificationHelper');

// Get all sales with optional filtering
router.get('/', (req, res) => {
  const db = getDatabase();
  const { 
    startDate, 
    endDate, 
    customer, 
    paymentMethod, 
    page = 1, 
    limit = 20 
  } = req.query;
  
  let query = `
    SELECT s.*, c.name as customer_name, u.full_name as cashier_name
    FROM sales s 
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN users u ON s.cashier_id = u.id
    WHERE 1=1
  `;
  let params = [];
  
  // Add date filters
  if (startDate) {
    query += ` AND DATE(s.created_at) >= ?`;
    params.push(startDate);
  }
  
  if (endDate) {
    query += ` AND DATE(s.created_at) <= ?`;
    params.push(endDate);
  }
  
  // Add customer filter
  if (customer) {
    query += ` AND s.customer_id = ?`;
    params.push(customer);
  }
  
  // Add payment method filter
  if (paymentMethod && paymentMethod !== 'all') {
    query += ` AND s.payment_method = ?`;
    params.push(paymentMethod);
  }
  
  // Add pagination
  const offset = (page - 1) * limit;
  query += ` ORDER BY s.created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), offset);
  
  db.all(query, params, (err, sales) => {
    if (err) {
      console.error('Error fetching sales:', err);
      return res.status(500).json({ error: 'Failed to fetch sales' });
    }
    
    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM sales WHERE 1=1`;
    let countParams = [];
    
    if (startDate) {
      countQuery += ` AND DATE(created_at) >= ?`;
      countParams.push(startDate);
    }
    
    if (endDate) {
      countQuery += ` AND DATE(created_at) <= ?`;
      countParams.push(endDate);
    }
    
    if (customer) {
      countQuery += ` AND customer_id = ?`;
      countParams.push(customer);
    }
    
    if (paymentMethod && paymentMethod !== 'all') {
      countQuery += ` AND payment_method = ?`;
      countParams.push(paymentMethod);
    }
    
    db.get(countQuery, countParams, (err, result) => {
      if (err) {
        console.error('Error counting sales:', err);
        return res.status(500).json({ error: 'Failed to count sales' });
      }
      
      res.json({
        sales,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.total,
          pages: Math.ceil(result.total / limit)
        }
      });
    });
  });
});

// Get today's total products sold
router.get('/products-sold', (req, res) => {
  const db = getDatabase();
  const { date } = req.query;
  
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  const query = `
    SELECT SUM(si.quantity) as total_products_sold
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    WHERE DATE(s.created_at) = ? AND s.payment_status = 'completed'
  `;
  
  db.get(query, [targetDate], (err, result) => {
    if (err) {
      console.error('Error fetching products sold:', err);
      return res.status(500).json({ error: 'Failed to fetch products sold' });
    }
    
    res.json({
      date: targetDate,
      total_products_sold: result.total_products_sold || 0
    });
  });
});

// Get sale by ID with items
router.get('/:id', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  
  // Get sale details
  const saleQuery = `
    SELECT s.*, c.name as customer_name, c.phone as customer_phone,
           u.full_name as cashier_name
    FROM sales s 
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN users u ON s.cashier_id = u.id
    WHERE s.id = ?
  `;
  
  db.get(saleQuery, [id], (err, sale) => {
    if (err) {
      console.error('Error fetching sale:', err);
      return res.status(500).json({ error: 'Failed to fetch sale' });
    }
    
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    
    // Get sale items
    const itemsQuery = `
      SELECT si.*, p.name as product_name, p.barcode, p.unit
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
    `;
    
    db.all(itemsQuery, [id], (err, items) => {
      if (err) {
        console.error('Error fetching sale items:', err);
        return res.status(500).json({ error: 'Failed to fetch sale items' });
      }
      
      res.json({
        ...sale,
        items
      });
    });
  });
});

// Create new sale
router.post('/', (req, res) => {
  const db = getDatabase();
  const {
    customer_id,
    items,
    total_amount,
    tax_amount = 0,
    discount_amount = 0,
    final_amount,
    payment_method,
    payment_status = 'completed',
    amount_received = 0,
    remaining_balance = 0,
    cashier_id = 1, // Default to admin for now
    notes
  } = req.body;
  
  // Validation
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Sale items are required' });
  }
  
  if (!final_amount || !payment_method) {
    return res.status(400).json({ error: 'Final amount and payment method are required' });
  }
  
  // Generate sale number
  const saleNumber = `SALE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  // Start transaction
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Create sale record
    const saleQuery = `
      INSERT INTO sales (
        sale_number, customer_id, total_amount, tax_amount, discount_amount,
        final_amount, payment_method, payment_status, amount_received, remaining_balance, cashier_id, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const saleParams = [
      saleNumber,
      customer_id || null,
      parseFloat(total_amount),
      parseFloat(tax_amount),
      parseFloat(discount_amount),
      parseFloat(final_amount),
      payment_method,
      payment_status,
      parseFloat(amount_received),
      parseFloat(remaining_balance),
      cashier_id,
      notes || null
    ];
    
    db.run(saleQuery, saleParams, function(err) {
      if (err) {
        db.run('ROLLBACK');
        console.error('Error creating sale:', err);
        return res.status(500).json({ error: 'Failed to create sale' });
      }
      
      const saleId = this.lastID;
      
      // Process sale items and update inventory
      let processedItems = 0;
      let hasError = false;
      
      items.forEach((item, index) => {
        const { product_id, quantity, unit_price, total_price } = item;
        
        // Insert sale item
        const itemQuery = `
          INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price)
          VALUES (?, ?, ?, ?, ?)
        `;
        
        db.run(itemQuery, [saleId, product_id, quantity, unit_price, total_price], function(err) {
          if (err) {
            hasError = true;
            db.run('ROLLBACK');
            console.error('Error creating sale item:', err);
            return res.status(500).json({ error: 'Failed to create sale item' });
          }
          
          // Update product stock
          const stockQuery = `
            UPDATE products 
            SET stock_quantity = stock_quantity - ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `;
          
          db.run(stockQuery, [quantity, product_id], function(err) {
            if (err) {
              hasError = true;
              db.run('ROLLBACK');
              console.error('Error updating stock:', err);
              return res.status(500).json({ error: 'Failed to update product stock' });
            }
            
            processedItems++;
            
            // If all items processed, commit transaction
            if (processedItems === items.length && !hasError) {
              // Handle credit transaction if customer has credit
              if (customer_id && (payment_method === 'credit' || payment_method === 'partial')) {
                const creditAmount = payment_method === 'credit' ? final_amount : remaining_balance;
                
                if (creditAmount > 0) {
                  const creditQuery = `
                    INSERT INTO credit_transactions (
                      customer_id, transaction_type, amount, description, reference_id, reference_type
                    ) VALUES (?, ?, ?, ?, ?, ?)
                  `;
                  
                  db.run(creditQuery, [
                    customer_id,
                    'debit',
                    creditAmount,
                    payment_method === 'partial' ? `Partial Sale ${saleNumber} (Remaining: ₱${creditAmount})` : `Sale ${saleNumber}`,
                    saleId,
                    'sale'
                  ], function(err) {
                    if (err) {
                      db.run('ROLLBACK');
                      console.error('Error creating credit transaction:', err);
                      return res.status(500).json({ error: 'Failed to create credit transaction' });
                    }
                    
                    // Update customer balance
                    const balanceQuery = `
                      UPDATE customers 
                      SET current_balance = current_balance + ?, updated_at = CURRENT_TIMESTAMP
                      WHERE id = ?
                    `;
                    
                    db.run(balanceQuery, [creditAmount, customer_id], function(err) {
                      if (err) {
                        db.run('ROLLBACK');
                        console.error('Error updating customer balance:', err);
                        return res.status(500).json({ error: 'Failed to update customer balance' });
                      }
                      
                      commitSale();
                    });
                  });
                } else {
                  commitSale();
                }
              } else {
                commitSale();
              }
            }
          });
        });
      });
      
      function commitSale() {
        db.run('COMMIT');
        
        // Get the complete sale with items
        const completeSaleQuery = `
          SELECT s.*, c.name as customer_name, c.phone as customer_phone,
                 u.full_name as cashier_name
          FROM sales s 
          LEFT JOIN customers c ON s.customer_id = c.id
          LEFT JOIN users u ON s.cashier_id = u.id
          WHERE s.id = ?
        `;
        
        db.get(completeSaleQuery, [saleId], (err, sale) => {
          if (err) {
            console.error('Error fetching created sale:', err);
            return res.status(500).json({ error: 'Sale created but failed to fetch' });
          }
          
          // Get sale items
          const itemsQuery = `
            SELECT si.*, p.name as product_name, p.barcode, p.unit
            FROM sale_items si
            JOIN products p ON si.product_id = p.id
            WHERE si.sale_id = ?
          `;
          
          db.all(itemsQuery, [saleId], (err, items) => {
            if (err) {
              console.error('Error fetching sale items:', err);
              return res.status(500).json({ error: 'Sale created but failed to fetch items' });
            }
            
            // Generate sales notification
            generateSalesNotification(saleId)
              .then(() => {
                res.status(201).json({
                  ...sale,
                  items
                });
              })
              .catch(err => {
                console.error('Error creating sales notification:', err);
                // Don't fail the sale if notification fails
                res.status(201).json({
                  ...sale,
                  items
                });
              });
          });
        });
      }
    });
  });
});

// Process payment for existing sale
router.post('/:id/payment', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const { payment_method, amount_paid, notes } = req.body;
  
  if (!payment_method || !amount_paid) {
    return res.status(400).json({ error: 'Payment method and amount are required' });
  }
  
  // Get sale details
  db.get('SELECT * FROM sales WHERE id = ?', [id], (err, sale) => {
    if (err) {
      console.error('Error fetching sale:', err);
      return res.status(500).json({ error: 'Failed to fetch sale' });
    }
    
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    
    if (sale.payment_status === 'completed') {
      return res.status(400).json({ error: 'Sale is already paid' });
    }
    
    // Update sale payment status
    const updateQuery = `
      UPDATE sales 
      SET payment_method = ?, payment_status = 'completed', notes = ?
      WHERE id = ?
    `;
    
    db.run(updateQuery, [payment_method, notes || sale.notes, id], function(err) {
      if (err) {
        console.error('Error updating sale payment:', err);
        return res.status(500).json({ error: 'Failed to update sale payment' });
      }
      
      res.json({ message: 'Payment processed successfully' });
    });
  });
});

// Void/refund sale
router.post('/:id/void', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const { reason } = req.body;
  
  if (!reason) {
    return res.status(400).json({ error: 'Void reason is required' });
  }
  
  // Start transaction
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Get sale with items
    const saleQuery = `
      SELECT s.*, si.*, p.name as product_name
      FROM sales s
      JOIN sale_items si ON s.id = si.sale_id
      JOIN products p ON si.product_id = p.id
      WHERE s.id = ?
    `;
    
    db.all(saleQuery, [id], (err, saleData) => {
      if (err) {
        db.run('ROLLBACK');
        console.error('Error fetching sale:', err);
        return res.status(500).json({ error: 'Failed to fetch sale' });
      }
      
      if (saleData.length === 0) {
        db.run('ROLLBACK');
        return res.status(404).json({ error: 'Sale not found' });
      }
      
      const sale = saleData[0];
      
      // Restore inventory
      let restoredItems = 0;
      saleData.forEach(item => {
        const stockQuery = `
          UPDATE products 
          SET stock_quantity = stock_quantity + ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `;
        
        db.run(stockQuery, [item.quantity, item.product_id], function(err) {
          if (err) {
            db.run('ROLLBACK');
            console.error('Error restoring stock:', err);
            return res.status(500).json({ error: 'Failed to restore product stock' });
          }
          
          restoredItems++;
          
          if (restoredItems === saleData.length) {
            // Update sale status
            const voidQuery = `
              UPDATE sales 
              SET payment_status = 'voided', notes = ?
              WHERE id = ?
            `;
            
            db.run(voidQuery, [reason, id], function(err) {
              if (err) {
                db.run('ROLLBACK');
                console.error('Error voiding sale:', err);
                return res.status(500).json({ error: 'Failed to void sale' });
              }
              
              db.run('COMMIT');
              res.json({ message: 'Sale voided successfully' });
            });
          }
        });
      });
    });
  });
});

// Get today's credit sales total
router.get('/today/credit', (req, res) => {
  const db = getDatabase();
  const today = new Date().toISOString().split('T')[0];
  
  console.log('Fetching today\'s credit sales for date:', today);
  
  // First, let's check what payment methods exist in today's sales
  const debugQuery = `
    SELECT payment_method, payment_status, COUNT(*) as count, SUM(final_amount) as total
    FROM sales 
    WHERE DATE(created_at) = ? 
    GROUP BY payment_method, payment_status
  `;
  
  db.all(debugQuery, [today], (err, debugResult) => {
    if (err) {
      console.error('Error in debug query:', err);
    } else {
      console.log('Today\'s sales by payment method:', debugResult);
    }
    
    // Now get the credit sales (including pending)
    const query = `
      SELECT 
        COUNT(*) as credit_transactions,
        SUM(final_amount) as total_credit_amount
      FROM sales 
      WHERE DATE(created_at) = ? 
      AND payment_method = 'credit' 
      AND payment_status IN ('completed', 'pending')
    `;
    
    db.get(query, [today], (err, result) => {
      if (err) {
        console.error('Error fetching today\'s credit sales:', err);
        return res.status(500).json({ error: 'Failed to fetch today\'s credit sales' });
      }
      
      console.log('Credit sales result:', result);
      
      res.json({
        date: today,
        credit_transactions: result.credit_transactions || 0,
        total_credit_amount: result.total_credit_amount || 0
      });
    });
  });
});

// Get daily sales summary
router.get('/summary/daily', (req, res) => {
  const db = getDatabase();
  const { date } = req.query;
  
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  const query = `
    SELECT 
      COUNT(*) as total_sales,
      SUM(final_amount) as total_revenue,
      SUM(CASE WHEN payment_method = 'cash' THEN final_amount ELSE 0 END) as cash_sales,
      SUM(CASE WHEN payment_method = 'gcash' THEN final_amount ELSE 0 END) as gcash_sales,
      SUM(CASE WHEN payment_method = 'credit' THEN final_amount ELSE 0 END) as credit_sales,
      AVG(final_amount) as average_sale,
      MIN(final_amount) as min_sale,
      MAX(final_amount) as max_sale
    FROM sales 
    WHERE DATE(created_at) = ? AND payment_status = 'completed'
  `;
  
  db.get(query, [targetDate], (err, summary) => {
    if (err) {
      console.error('Error fetching daily summary:', err);
      return res.status(500).json({ error: 'Failed to fetch daily summary' });
    }
    
    // Calculate total cost from sale items
    const costQuery = `
      SELECT SUM(si.quantity * p.cost_price) as total_cost
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      JOIN sales s ON si.sale_id = s.id
      WHERE DATE(s.created_at) = ? AND s.payment_status = 'completed'
    `;
    
    db.get(costQuery, [targetDate], (err, costResult) => {
      if (err) {
        console.error('Error calculating total cost:', err);
        return res.status(500).json({ error: 'Failed to calculate total cost' });
      }
      
      res.json({
        date: targetDate,
        ...summary,
        total_cost: costResult.total_cost || 0
      });
    });
  });
});

// Get sales by date range
router.get('/summary/range', (req, res) => {
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
      AVG(final_amount) as average_sale
    FROM sales 
    WHERE DATE(created_at) BETWEEN ? AND ? AND payment_status = 'completed'
    GROUP BY DATE(created_at)
    ORDER BY date
  `;
  
  db.all(query, [startDate, endDate], (err, summary) => {
    if (err) {
      console.error('Error fetching sales summary:', err);
      return res.status(500).json({ error: 'Failed to fetch sales summary' });
    }
    
    res.json(summary);
  });
});

// Get sale receipt details
router.get('/:id/receipt', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  
  // Get sale details
  const saleQuery = `
    SELECT s.*, c.name as customer_name, u.full_name as cashier_name
    FROM sales s 
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN users u ON s.cashier_id = u.id
    WHERE s.id = ?
  `;
  
  db.get(saleQuery, [id], (err, sale) => {
    if (err) {
      console.error('Error fetching sale:', err);
      return res.status(500).json({ error: 'Failed to fetch sale' });
    }
    
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    
    // Get sale items
    const itemsQuery = `
      SELECT si.*, p.name as product_name, p.barcode
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
    `;
    
    db.all(itemsQuery, [id], (err, items) => {
      if (err) {
        console.error('Error fetching sale items:', err);
        return res.status(500).json({ error: 'Failed to fetch sale items' });
      }
      
      // Get receipt details if exists
      const receiptQuery = `
        SELECT * FROM receipts WHERE sale_id = ?
      `;
      
      db.get(receiptQuery, [id], (err, receipt) => {
        if (err) {
          console.error('Error fetching receipt:', err);
          return res.status(500).json({ error: 'Failed to fetch receipt' });
        }
        
        res.json({
          ...sale,
          items,
          receipt_number: receipt ? receipt.receipt_number : sale.sale_number,
          receipt_type: receipt ? receipt.receipt_type : 'print'
        });
      });
    });
  });
});

module.exports = router;
