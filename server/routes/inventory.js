const express = require('express');
const router = express.Router();
const { getDatabase } = require('../models/database');

// Get inventory summary
router.get('/summary', (req, res) => {
  const db = getDatabase();
  
  const query = `
    SELECT 
      COUNT(*) as total_products,
      SUM(stock_quantity) as total_stock,
      SUM(CASE WHEN stock_quantity <= min_stock_level THEN 1 ELSE 0 END) as low_stock_count,
      SUM(CASE WHEN stock_quantity = 0 THEN 1 ELSE 0 END) as out_of_stock_count,
      AVG(stock_quantity) as average_stock,
      SUM(stock_quantity * cost_price) as total_inventory_value
    FROM products 
    WHERE is_active = 1
  `;
  
  db.get(query, (err, summary) => {
    if (err) {
      console.error('Error fetching inventory summary:', err);
      return res.status(500).json({ error: 'Failed to fetch inventory summary' });
    }
    
    res.json(summary);
  });
});

// Get inventory adjustments
router.get('/adjustments', (req, res) => {
  const db = getDatabase();
  const { product_id, adjustment_type, startDate, endDate, page = 1, limit = 20 } = req.query;
  
  let query = `
    SELECT ia.*, p.name as product_name, u.full_name as adjusted_by_name
    FROM inventory_adjustments ia
    JOIN products p ON ia.product_id = p.id
    LEFT JOIN users u ON ia.adjusted_by = u.id
    WHERE 1=1
  `;
  let params = [];
  
  if (product_id) {
    query += ` AND ia.product_id = ?`;
    params.push(product_id);
  }
  
  if (adjustment_type) {
    query += ` AND ia.adjustment_type = ?`;
    params.push(adjustment_type);
  }
  
  if (startDate) {
    query += ` AND DATE(ia.created_at) >= ?`;
    params.push(startDate);
  }
  
  if (endDate) {
    query += ` AND DATE(ia.created_at) <= ?`;
    params.push(endDate);
  }
  
  const offset = (page - 1) * limit;
  query += ` ORDER BY ia.created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), offset);
  
  db.all(query, params, (err, adjustments) => {
    if (err) {
      console.error('Error fetching adjustments:', err);
      return res.status(500).json({ error: 'Failed to fetch adjustments' });
    }
    
    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM inventory_adjustments WHERE 1=1`;
    let countParams = [];
    
    if (product_id) {
      countQuery += ` AND product_id = ?`;
      countParams.push(product_id);
    }
    
    if (adjustment_type) {
      countQuery += ` AND adjustment_type = ?`;
      countParams.push(adjustment_type);
    }
    
    if (startDate) {
      countQuery += ` AND DATE(created_at) >= ?`;
      countParams.push(startDate);
    }
    
    if (endDate) {
      countQuery += ` AND DATE(created_at) <= ?`;
      countParams.push(endDate);
    }
    
    db.get(countQuery, countParams, (err, result) => {
      if (err) {
        console.error('Error counting adjustments:', err);
        return res.status(500).json({ error: 'Failed to count adjustments' });
      }
      
      res.json({
        adjustments,
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

// Create inventory adjustment
router.post('/adjustments', (req, res) => {
  const db = getDatabase();
  const { product_id, adjustment_type, quantity, reason, adjusted_by = 1 } = req.body;
  
  if (!product_id || !adjustment_type || !quantity) {
    return res.status(400).json({ error: 'Product ID, adjustment type, and quantity are required' });
  }
  
  if (!['add', 'subtract', 'set'].includes(adjustment_type)) {
    return res.status(400).json({ error: 'Invalid adjustment type' });
  }
  
  // Start transaction
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Get current product
    db.get('SELECT * FROM products WHERE id = ?', [product_id], (err, product) => {
      if (err) {
        db.run('ROLLBACK');
        console.error('Error fetching product:', err);
        return res.status(500).json({ error: 'Failed to fetch product' });
      }
      
      if (!product) {
        db.run('ROLLBACK');
        return res.status(404).json({ error: 'Product not found' });
      }
      
      // Calculate new stock quantity
      let newQuantity = product.stock_quantity;
      if (adjustment_type === 'add') {
        newQuantity += parseInt(quantity);
      } else if (adjustment_type === 'subtract') {
        newQuantity -= parseInt(quantity);
        if (newQuantity < 0) {
          db.run('ROLLBACK');
          return res.status(400).json({ error: 'Insufficient stock' });
        }
      } else if (adjustment_type === 'set') {
        newQuantity = parseInt(quantity);
      }
      
      // Update product stock
      db.run(
        'UPDATE products SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newQuantity, product_id],
        function(err) {
          if (err) {
            db.run('ROLLBACK');
            console.error('Error updating stock:', err);
            return res.status(500).json({ error: 'Failed to update stock' });
          }
          
          // Record adjustment
          const adjustmentQuery = `
            INSERT INTO inventory_adjustments (product_id, adjustment_type, quantity, reason, adjusted_by)
            VALUES (?, ?, ?, ?, ?)
          `;
          
          db.run(adjustmentQuery, [product_id, adjustment_type, quantity, reason || null, adjusted_by], function(err) {
            if (err) {
              db.run('ROLLBACK');
              console.error('Error recording adjustment:', err);
              return res.status(500).json({ error: 'Failed to record adjustment' });
            }
            
            db.run('COMMIT');
            
            // Get updated product
            db.get('SELECT * FROM products WHERE id = ?', [product_id], (err, updatedProduct) => {
              if (err) {
                console.error('Error fetching updated product:', err);
                return res.status(500).json({ error: 'Adjustment created but failed to fetch product' });
              }
              
              res.status(201).json({
                message: 'Inventory adjustment created successfully',
                product: updatedProduct
              });
            });
          });
        }
      );
    });
  });
});

// Get low stock alerts
router.get('/alerts/low-stock', (req, res) => {
  const db = getDatabase();
  
  const query = `
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.stock_quantity <= p.min_stock_level AND p.is_active = 1
    ORDER BY p.stock_quantity ASC
  `;
  
  db.all(query, (err, products) => {
    if (err) {
      console.error('Error fetching low stock products:', err);
      return res.status(500).json({ error: 'Failed to fetch low stock products' });
    }
    
    res.json(products);
  });
});

// Get out of stock products
router.get('/alerts/out-of-stock', (req, res) => {
  const db = getDatabase();
  
  const query = `
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.stock_quantity = 0 AND p.is_active = 1
    ORDER BY p.name
  `;
  
  db.all(query, (err, products) => {
    if (err) {
      console.error('Error fetching out of stock products:', err);
      return res.status(500).json({ error: 'Failed to fetch out of stock products' });
    }
    
    res.json(products);
  });
});

// Get inventory value by category
router.get('/value/by-category', (req, res) => {
  const db = getDatabase();
  
  const query = `
    SELECT 
      c.name as category_name,
      COUNT(p.id) as product_count,
      SUM(p.stock_quantity) as total_stock,
      SUM(p.stock_quantity * p.cost_price) as inventory_value,
      AVG(p.stock_quantity) as average_stock
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = 1
    GROUP BY c.id, c.name
    ORDER BY inventory_value DESC
  `;
  
  db.all(query, (err, categories) => {
    if (err) {
      console.error('Error fetching inventory value by category:', err);
      return res.status(500).json({ error: 'Failed to fetch inventory value by category' });
    }
    
    res.json(categories);
  });
});

// Get inventory movement report
router.get('/movement', (req, res) => {
  const db = getDatabase();
  const { startDate, endDate, product_id } = req.query;
  
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Start date and end date are required' });
  }
  
  let query = `
    SELECT 
      p.name as product_name,
      p.barcode,
      c.name as category_name,
      SUM(CASE WHEN ia.adjustment_type = 'add' THEN ia.quantity ELSE 0 END) as stock_in,
      SUM(CASE WHEN ia.adjustment_type = 'subtract' THEN ia.quantity ELSE 0 END) as stock_out,
      SUM(CASE WHEN ia.adjustment_type = 'set' THEN ia.quantity ELSE 0 END) as stock_adjustment,
      COUNT(ia.id) as total_adjustments
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN inventory_adjustments ia ON p.id = ia.product_id 
      AND DATE(ia.created_at) BETWEEN ? AND ?
    WHERE p.is_active = 1
  `;
  
  let params = [startDate, endDate];
  
  if (product_id) {
    query += ` AND p.id = ?`;
    params.push(product_id);
  }
  
  query += ` GROUP BY p.id, p.name, p.barcode, c.name ORDER BY p.name`;
  
  db.all(query, params, (err, movements) => {
    if (err) {
      console.error('Error fetching inventory movement:', err);
      return res.status(500).json({ error: 'Failed to fetch inventory movement' });
    }
    
    res.json(movements);
  });
});

module.exports = router;
