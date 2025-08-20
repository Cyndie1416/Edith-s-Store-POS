const express = require('express');
const router = express.Router();
const { getDatabase } = require('../models/database');

// Get all borrowed items
router.get('/', async (req, res) => {
  const db = getDatabase();
  
  try {
    const query = `
      SELECT 
        bi.id,
        bi.customer_id,
        bi.product_id,
        bi.quantity,
        bi.borrow_date,
        bi.expected_return_date,
        bi.actual_return_date,
        bi.status,
        bi.notes,
        bi.borrowed_by,
        bi.returned_to,
        bi.created_at,
        bi.updated_at,
        c.name as customer_name,
        c.phone as customer_phone,
        p.name as product_name,
        p.barcode as product_barcode,
        ub.full_name as borrowed_by_name,
        ur.full_name as returned_to_name
      FROM borrowed_items bi
      LEFT JOIN customers c ON bi.customer_id = c.id
      LEFT JOIN products p ON bi.product_id = p.id
      LEFT JOIN users ub ON bi.borrowed_by = ub.id
      LEFT JOIN users ur ON bi.returned_to = ur.id
      ORDER BY bi.created_at DESC
    `;
    
    db.all(query, [], (err, rows) => {
      if (err) {
        console.error('Error fetching borrowed items:', err);
        return res.status(500).json({ error: 'Failed to fetch borrowed items' });
      }
      res.json({ borrowed_items: rows });
    });
  } catch (error) {
    console.error('Error in borrowed items route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get borrowed items by customer
router.get('/customer/:customerId', async (req, res) => {
  const db = getDatabase();
  const { customerId } = req.params;
  
  try {
    const query = `
      SELECT 
        bi.id,
        bi.customer_id,
        bi.product_id,
        bi.quantity,
        bi.borrow_date,
        bi.expected_return_date,
        bi.actual_return_date,
        bi.status,
        bi.notes,
        bi.borrowed_by,
        bi.returned_to,
        bi.created_at,
        bi.updated_at,
        c.name as customer_name,
        c.phone as customer_phone,
        p.name as product_name,
        p.barcode as product_barcode,
        ub.full_name as borrowed_by_name,
        ur.full_name as returned_to_name
      FROM borrowed_items bi
      LEFT JOIN customers c ON bi.customer_id = c.id
      LEFT JOIN products p ON bi.product_id = p.id
      LEFT JOIN users ub ON bi.borrowed_by = ub.id
      LEFT JOIN users ur ON bi.returned_to = ur.id
      WHERE bi.customer_id = ?
      ORDER BY bi.created_at DESC
    `;
    
    db.all(query, [customerId], (err, rows) => {
      if (err) {
        console.error('Error fetching customer borrowed items:', err);
        return res.status(500).json({ error: 'Failed to fetch customer borrowed items' });
      }
      res.json({ borrowed_items: rows });
    });
  } catch (error) {
    console.error('Error in customer borrowed items route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new borrowed item
router.post('/', async (req, res) => {
  const db = getDatabase();
  const {
    customer_id,
    product_id,
    quantity,
    expected_return_date,
    notes,
    borrowed_by
  } = req.body;
  
  try {
    // Validate required fields
    if (!customer_id || !product_id || !quantity) {
      return res.status(400).json({ error: 'Customer ID, product ID, and quantity are required' });
    }
    
    // Check if product exists and has sufficient stock
    db.get('SELECT stock_quantity FROM products WHERE id = ?', [product_id], (err, product) => {
      if (err) {
        console.error('Error checking product stock:', err);
        return res.status(500).json({ error: 'Failed to check product stock' });
      }
      
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      if (product.stock_quantity < quantity) {
        return res.status(400).json({ error: 'Insufficient stock for borrowing' });
      }
      
      // Insert borrowed item
      const insertQuery = `
        INSERT INTO borrowed_items 
        (customer_id, product_id, quantity, expected_return_date, notes, borrowed_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      db.run(insertQuery, [customer_id, product_id, quantity, expected_return_date, notes, borrowed_by], function(err) {
        if (err) {
          console.error('Error creating borrowed item:', err);
          return res.status(500).json({ error: 'Failed to create borrowed item' });
        }
        
        // Update product stock (reduce by borrowed quantity)
        const updateStockQuery = 'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?';
        db.run(updateStockQuery, [quantity, product_id], (err) => {
          if (err) {
            console.error('Error updating product stock:', err);
            return res.status(500).json({ error: 'Failed to update product stock' });
          }
          
          res.status(201).json({ 
            message: 'Item borrowed successfully',
            borrowed_item_id: this.lastID 
          });
        });
      });
    });
  } catch (error) {
    console.error('Error in create borrowed item route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Return borrowed item
router.put('/:id/return', async (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const { returned_to, notes } = req.body;
  
  try {
    // Get the borrowed item details
    db.get('SELECT * FROM borrowed_items WHERE id = ?', [id], (err, item) => {
      if (err) {
        console.error('Error fetching borrowed item:', err);
        return res.status(500).json({ error: 'Failed to fetch borrowed item' });
      }
      
      if (!item) {
        return res.status(404).json({ error: 'Borrowed item not found' });
      }
      
      if (item.status === 'returned') {
        return res.status(400).json({ error: 'Item has already been returned' });
      }
      
      // Update borrowed item status
      const updateQuery = `
        UPDATE borrowed_items 
        SET status = 'returned', 
            actual_return_date = CURRENT_TIMESTAMP,
            returned_to = ?,
            notes = COALESCE(?, notes),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      db.run(updateQuery, [returned_to, notes, id], function(err) {
        if (err) {
          console.error('Error returning borrowed item:', err);
          return res.status(500).json({ error: 'Failed to return borrowed item' });
        }
        
        // Update product stock (add back the returned quantity)
        const updateStockQuery = 'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?';
        db.run(updateStockQuery, [item.quantity, item.product_id], (err) => {
          if (err) {
            console.error('Error updating product stock:', err);
            return res.status(500).json({ error: 'Failed to update product stock' });
          }
          
          res.json({ message: 'Item returned successfully' });
        });
      });
    });
  } catch (error) {
    console.error('Error in return borrowed item route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update borrowed item
router.put('/:id', async (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const {
    expected_return_date,
    notes
  } = req.body;
  
  try {
    const updateQuery = `
      UPDATE borrowed_items 
      SET expected_return_date = ?,
          notes = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    db.run(updateQuery, [expected_return_date, notes, id], function(err) {
      if (err) {
        console.error('Error updating borrowed item:', err);
        return res.status(500).json({ error: 'Failed to update borrowed item' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Borrowed item not found' });
      }
      
      res.json({ message: 'Borrowed item updated successfully' });
    });
  } catch (error) {
    console.error('Error in update borrowed item route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete borrowed item (only if not returned)
router.delete('/:id', async (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  
  try {
    // Check if item exists and is not returned
    db.get('SELECT * FROM borrowed_items WHERE id = ?', [id], (err, item) => {
      if (err) {
        console.error('Error fetching borrowed item:', err);
        return res.status(500).json({ error: 'Failed to fetch borrowed item' });
      }
      
      if (!item) {
        return res.status(404).json({ error: 'Borrowed item not found' });
      }
      
      if (item.status === 'returned') {
        return res.status(400).json({ error: 'Cannot delete returned items' });
      }
      
      // Delete the borrowed item
      db.run('DELETE FROM borrowed_items WHERE id = ?', [id], function(err) {
        if (err) {
          console.error('Error deleting borrowed item:', err);
          return res.status(500).json({ error: 'Failed to delete borrowed item' });
        }
        
        // Update product stock (add back the quantity)
        const updateStockQuery = 'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?';
        db.run(updateStockQuery, [item.quantity, item.product_id], (err) => {
          if (err) {
            console.error('Error updating product stock:', err);
            return res.status(500).json({ error: 'Failed to update product stock' });
          }
          
          res.json({ message: 'Borrowed item deleted successfully' });
        });
      });
    });
  } catch (error) {
    console.error('Error in delete borrowed item route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
