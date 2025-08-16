const express = require('express');
const router = express.Router();
const { getDatabase } = require('../models/database');

// Get all products with optional filtering
router.get('/', (req, res) => {
  const db = getDatabase();
  const { search, category, lowStock, page = 1, limit = 20 } = req.query;
  
  let query = `
    SELECT p.*, c.name as category_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id 
    WHERE p.is_active = 1
  `;
  let params = [];
  
  // Add search filter
  if (search) {
    query += ` AND (p.name LIKE ? OR p.description LIKE ? OR p.barcode LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  
  // Add category filter
  if (category) {
    query += ` AND p.category_id = ?`;
    params.push(category);
  }
  
  // Add low stock filter
  if (lowStock === 'true') {
    query += ` AND p.stock_quantity <= p.min_stock_level`;
  }
  
  // Add pagination
  const offset = (page - 1) * limit;
  query += ` ORDER BY p.name LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), offset);
  
  db.all(query, params, (err, products) => {
    if (err) {
      console.error('Error fetching products:', err);
      return res.status(500).json({ error: 'Failed to fetch products' });
    }
    
    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM products WHERE is_active = 1`;
    let countParams = [];
    
    if (search) {
      countQuery += ` AND (name LIKE ? OR description LIKE ? OR barcode LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (category) {
      countQuery += ` AND category_id = ?`;
      countParams.push(category);
    }
    
    if (lowStock === 'true') {
      countQuery += ` AND stock_quantity <= min_stock_level`;
    }
    
    db.get(countQuery, countParams, (err, result) => {
      if (err) {
        console.error('Error counting products:', err);
        return res.status(500).json({ error: 'Failed to count products' });
      }
      
      res.json({
        products,
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

// Get product by ID
router.get('/:id', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  
  const query = `
    SELECT p.*, c.name as category_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id 
    WHERE p.id = ? AND p.is_active = 1
  `;
  
  db.get(query, [id], (err, product) => {
    if (err) {
      console.error('Error fetching product:', err);
      return res.status(500).json({ error: 'Failed to fetch product' });
    }
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product);
  });
});

// Get product by barcode
router.get('/barcode/:barcode', (req, res) => {
  const db = getDatabase();
  const { barcode } = req.params;
  
  const query = `
    SELECT p.*, c.name as category_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id 
    WHERE p.barcode = ? AND p.is_active = 1
  `;
  
  db.get(query, [barcode], (err, product) => {
    if (err) {
      console.error('Error fetching product by barcode:', err);
      return res.status(500).json({ error: 'Failed to fetch product' });
    }
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product);
  });
});

// Create new product
router.post('/', (req, res) => {
  const db = getDatabase();
  const {
    name,
    description,
    barcode,
    category_id,
    price,
    cost_price,
    stock_quantity,
    min_stock_level,
    unit,
    image_url
  } = req.body;
  
  // Validation
  if (!name || !price || !cost_price) {
    return res.status(400).json({ error: 'Name, price, and cost price are required' });
  }
  
  const query = `
    INSERT INTO products (
      name, description, barcode, category_id, price, cost_price, 
      stock_quantity, min_stock_level, unit, image_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const params = [
    name,
    description || null,
    barcode || null,
    category_id || null,
    parseFloat(price),
    parseFloat(cost_price),
    parseInt(stock_quantity) || 0,
    parseInt(min_stock_level) || 5,
    unit || 'piece',
    image_url || null
  ];
  
  db.run(query, params, function(err) {
    if (err) {
      console.error('Error creating product:', err);
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Product with this barcode already exists' });
      }
      return res.status(500).json({ error: 'Failed to create product' });
    }
    
    // Get the created product
    db.get('SELECT * FROM products WHERE id = ?', [this.lastID], (err, product) => {
      if (err) {
        console.error('Error fetching created product:', err);
        return res.status(500).json({ error: 'Product created but failed to fetch' });
      }
      
      res.status(201).json(product);
    });
  });
});

// Update product
router.put('/:id', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const {
    name,
    description,
    barcode,
    category_id,
    price,
    cost_price,
    stock_quantity,
    min_stock_level,
    unit,
    image_url
  } = req.body;
  
  // Check if product exists
  db.get('SELECT * FROM products WHERE id = ?', [id], (err, product) => {
    if (err) {
      console.error('Error checking product:', err);
      return res.status(500).json({ error: 'Failed to check product' });
    }
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const query = `
      UPDATE products SET 
        name = ?, description = ?, barcode = ?, category_id = ?, 
        price = ?, cost_price = ?, stock_quantity = ?, min_stock_level = ?, 
        unit = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    const params = [
      name || product.name,
      description !== undefined ? description : product.description,
      barcode || product.barcode,
      category_id || product.category_id,
      parseFloat(price) || product.price,
      parseFloat(cost_price) || product.cost_price,
      parseInt(stock_quantity) || product.stock_quantity,
      parseInt(min_stock_level) || product.min_stock_level,
      unit || product.unit,
      image_url !== undefined ? image_url : product.image_url,
      id
    ];
    
    db.run(query, params, function(err) {
      if (err) {
        console.error('Error updating product:', err);
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Product with this barcode already exists' });
        }
        return res.status(500).json({ error: 'Failed to update product' });
      }
      
      // Get the updated product
      db.get('SELECT * FROM products WHERE id = ?', [id], (err, updatedProduct) => {
        if (err) {
          console.error('Error fetching updated product:', err);
          return res.status(500).json({ error: 'Product updated but failed to fetch' });
        }
        
        res.json(updatedProduct);
      });
    });
  });
});

// Delete product (soft delete)
router.delete('/:id', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  
  const query = 'UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
  
  db.run(query, [id], function(err) {
    if (err) {
      console.error('Error deleting product:', err);
      return res.status(500).json({ error: 'Failed to delete product' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({ message: 'Product deleted successfully' });
  });
});

// Update stock quantity
router.patch('/:id/stock', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const { quantity, adjustment_type, reason } = req.body;
  
  if (!quantity || !adjustment_type) {
    return res.status(400).json({ error: 'Quantity and adjustment type are required' });
  }
  
  // Start transaction
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Get current product
    db.get('SELECT * FROM products WHERE id = ?', [id], (err, product) => {
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
        [newQuantity, id],
        function(err) {
          if (err) {
            db.run('ROLLBACK');
            console.error('Error updating stock:', err);
            return res.status(500).json({ error: 'Failed to update stock' });
          }
          
          // Record inventory adjustment
          const adjustmentQuery = `
            INSERT INTO inventory_adjustments (product_id, adjustment_type, quantity, reason)
            VALUES (?, ?, ?, ?)
          `;
          
          db.run(adjustmentQuery, [id, adjustment_type, quantity, reason || null], function(err) {
            if (err) {
              db.run('ROLLBACK');
              console.error('Error recording adjustment:', err);
              return res.status(500).json({ error: 'Failed to record adjustment' });
            }
            
            db.run('COMMIT');
            
            // Get updated product
            db.get('SELECT * FROM products WHERE id = ?', [id], (err, updatedProduct) => {
              if (err) {
                console.error('Error fetching updated product:', err);
                return res.status(500).json({ error: 'Stock updated but failed to fetch product' });
              }
              
              res.json({
                message: 'Stock updated successfully',
                product: updatedProduct
              });
            });
          });
        }
      );
    });
  });
});

// Get low stock products
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

module.exports = router;
