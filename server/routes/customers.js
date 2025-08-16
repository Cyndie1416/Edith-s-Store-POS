const express = require('express');
const router = express.Router();
const { getDatabase } = require('../models/database');

// Get all customers with optional filtering
router.get('/', (req, res) => {
  const db = getDatabase();
  const { search, hasCredit, page = 1, limit = 20 } = req.query;
  
  let query = `
    SELECT * FROM customers 
    WHERE is_active = 1
  `;
  let params = [];
  
  // Add search filter
  if (search) {
    query += ` AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  
  // Add credit filter
  if (hasCredit === 'true') {
    query += ` AND current_balance > 0`;
  } else if (hasCredit === 'false') {
    query += ` AND current_balance = 0`;
  }
  
  // Add pagination
  const offset = (page - 1) * limit;
  query += ` ORDER BY name LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), offset);
  
  db.all(query, params, (err, customers) => {
    if (err) {
      console.error('Error fetching customers:', err);
      return res.status(500).json({ error: 'Failed to fetch customers' });
    }
    
    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM customers WHERE is_active = 1`;
    let countParams = [];
    
    if (search) {
      countQuery += ` AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (hasCredit === 'true') {
      countQuery += ` AND current_balance > 0`;
    } else if (hasCredit === 'false') {
      countQuery += ` AND current_balance = 0`;
    }
    
    db.get(countQuery, countParams, (err, result) => {
      if (err) {
        console.error('Error counting customers:', err);
        return res.status(500).json({ error: 'Failed to count customers' });
      }
      
      res.json({
        customers,
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

// Get customer by ID
router.get('/:id', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  
  const query = 'SELECT * FROM customers WHERE id = ? AND is_active = 1';
  
  db.get(query, [id], (err, customer) => {
    if (err) {
      console.error('Error fetching customer:', err);
      return res.status(500).json({ error: 'Failed to fetch customer' });
    }
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json(customer);
  });
});

// Get customer by phone
router.get('/phone/:phone', (req, res) => {
  const db = getDatabase();
  const { phone } = req.params;
  
  const query = 'SELECT * FROM customers WHERE phone = ? AND is_active = 1';
  
  db.get(query, [phone], (err, customer) => {
    if (err) {
      console.error('Error fetching customer by phone:', err);
      return res.status(500).json({ error: 'Failed to fetch customer' });
    }
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json(customer);
  });
});

// Create new customer
router.post('/', (req, res) => {
  const db = getDatabase();
  const {
    name,
    phone,
    email,
    address,
    credit_limit = 0
  } = req.body;
  
  // Validation
  if (!name) {
    return res.status(400).json({ error: 'Customer name is required' });
  }
  
  const query = `
    INSERT INTO customers (name, phone, email, address, credit_limit)
    VALUES (?, ?, ?, ?, ?)
  `;
  
  const params = [
    name,
    phone || null,
    email || null,
    address || null,
    parseFloat(credit_limit)
  ];
  
  db.run(query, params, function(err) {
    if (err) {
      console.error('Error creating customer:', err);
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Customer with this phone number already exists' });
      }
      return res.status(500).json({ error: 'Failed to create customer' });
    }
    
    // Get the created customer
    db.get('SELECT * FROM customers WHERE id = ?', [this.lastID], (err, customer) => {
      if (err) {
        console.error('Error fetching created customer:', err);
        return res.status(500).json({ error: 'Customer created but failed to fetch' });
      }
      
      res.status(201).json(customer);
    });
  });
});

// Update customer
router.put('/:id', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const {
    name,
    phone,
    email,
    address,
    credit_limit
  } = req.body;
  
  // Check if customer exists
  db.get('SELECT * FROM customers WHERE id = ?', [id], (err, customer) => {
    if (err) {
      console.error('Error checking customer:', err);
      return res.status(500).json({ error: 'Failed to check customer' });
    }
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    const query = `
      UPDATE customers SET 
        name = ?, phone = ?, email = ?, address = ?, 
        credit_limit = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    const params = [
      name || customer.name,
      phone !== undefined ? phone : customer.phone,
      email !== undefined ? email : customer.email,
      address !== undefined ? address : customer.address,
      credit_limit !== undefined ? parseFloat(credit_limit) : customer.credit_limit,
      id
    ];
    
    db.run(query, params, function(err) {
      if (err) {
        console.error('Error updating customer:', err);
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Customer with this phone number already exists' });
        }
        return res.status(500).json({ error: 'Failed to update customer' });
      }
      
      // Get the updated customer
      db.get('SELECT * FROM customers WHERE id = ?', [id], (err, updatedCustomer) => {
        if (err) {
          console.error('Error fetching updated customer:', err);
          return res.status(500).json({ error: 'Customer updated but failed to fetch' });
        }
        
        res.json(updatedCustomer);
      });
    });
  });
});

// Delete customer (soft delete)
router.delete('/:id', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  
  const query = 'UPDATE customers SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
  
  db.run(query, [id], function(err) {
    if (err) {
      console.error('Error deleting customer:', err);
      return res.status(500).json({ error: 'Failed to delete customer' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json({ message: 'Customer deleted successfully' });
  });
});

// Get customer credit transactions
router.get('/:id/transactions', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const { page = 1, limit = 20 } = req.query;
  
  // Check if customer exists
  db.get('SELECT * FROM customers WHERE id = ?', [id], (err, customer) => {
    if (err) {
      console.error('Error checking customer:', err);
      return res.status(500).json({ error: 'Failed to check customer' });
    }
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    const offset = (page - 1) * limit;
    const query = `
      SELECT * FROM credit_transactions 
      WHERE customer_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    
    db.all(query, [id, parseInt(limit), offset], (err, transactions) => {
      if (err) {
        console.error('Error fetching transactions:', err);
        return res.status(500).json({ error: 'Failed to fetch transactions' });
      }
      
      // Get total count for pagination
      db.get(
        'SELECT COUNT(*) as total FROM credit_transactions WHERE customer_id = ?',
        [id],
        (err, result) => {
          if (err) {
            console.error('Error counting transactions:', err);
            return res.status(500).json({ error: 'Failed to count transactions' });
          }
          
          res.json({
            customer,
            transactions,
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: result.total,
              pages: Math.ceil(result.total / limit)
            }
          });
        }
      );
    });
  });
});

// Add credit transaction
router.post('/:id/transactions', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const {
    transaction_type,
    amount,
    description,
    reference_id,
    reference_type
  } = req.body;
  
  // Validation
  if (!transaction_type || !amount || !description) {
    return res.status(400).json({ error: 'Transaction type, amount, and description are required' });
  }
  
  if (!['credit', 'debit', 'payment'].includes(transaction_type)) {
    return res.status(400).json({ error: 'Invalid transaction type' });
  }
  
  // Start transaction
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Check if customer exists
    db.get('SELECT * FROM customers WHERE id = ?', [id], (err, customer) => {
      if (err) {
        db.run('ROLLBACK');
        console.error('Error checking customer:', err);
        return res.status(500).json({ error: 'Failed to check customer' });
      }
      
      if (!customer) {
        db.run('ROLLBACK');
        return res.status(404).json({ error: 'Customer not found' });
      }
      
      // Insert credit transaction
      const transactionQuery = `
        INSERT INTO credit_transactions (
          customer_id, transaction_type, amount, description, reference_id, reference_type
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      const transactionParams = [
        id,
        transaction_type,
        parseFloat(amount),
        description,
        reference_id || null,
        reference_type || null
      ];
      
      db.run(transactionQuery, transactionParams, function(err) {
        if (err) {
          db.run('ROLLBACK');
          console.error('Error creating transaction:', err);
          return res.status(500).json({ error: 'Failed to create transaction' });
        }
        
        // Update customer balance
        let balanceChange = 0;
        if (transaction_type === 'credit') {
          balanceChange = parseFloat(amount);
        } else if (transaction_type === 'debit') {
          balanceChange = parseFloat(amount);
        } else if (transaction_type === 'payment') {
          balanceChange = -parseFloat(amount);
        }
        
        const balanceQuery = `
          UPDATE customers 
          SET current_balance = current_balance + ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `;
        
        db.run(balanceQuery, [balanceChange, id], function(err) {
          if (err) {
            db.run('ROLLBACK');
            console.error('Error updating customer balance:', err);
            return res.status(500).json({ error: 'Failed to update customer balance' });
          }
          
          db.run('COMMIT');
          
          // Get updated customer
          db.get('SELECT * FROM customers WHERE id = ?', [id], (err, updatedCustomer) => {
            if (err) {
              console.error('Error fetching updated customer:', err);
              return res.status(500).json({ error: 'Transaction created but failed to fetch customer' });
            }
            
            res.status(201).json({
              message: 'Transaction created successfully',
              customer: updatedCustomer
            });
          });
        });
      });
    });
  });
});

// Get customers with outstanding credit
router.get('/alerts/outstanding-credit', (req, res) => {
  const db = getDatabase();
  
  const query = `
    SELECT * FROM customers 
    WHERE current_balance > 0 AND is_active = 1
    ORDER BY current_balance DESC
  `;
  
  db.all(query, (err, customers) => {
    if (err) {
      console.error('Error fetching customers with outstanding credit:', err);
      return res.status(500).json({ error: 'Failed to fetch customers with outstanding credit' });
    }
    
    res.json(customers);
  });
});

// Get credit summary
router.get('/summary/credit', (req, res) => {
  const db = getDatabase();
  
  const query = `
    SELECT 
      COUNT(*) as total_customers,
      COUNT(CASE WHEN current_balance > 0 THEN 1 END) as customers_with_credit,
      SUM(current_balance) as total_outstanding_credit,
      AVG(current_balance) as average_credit_balance,
      MAX(current_balance) as max_credit_balance
    FROM customers 
    WHERE is_active = 1
  `;
  
  db.get(query, (err, summary) => {
    if (err) {
      console.error('Error fetching credit summary:', err);
      return res.status(500).json({ error: 'Failed to fetch credit summary' });
    }
    
    res.json(summary);
  });
});

module.exports = router;
