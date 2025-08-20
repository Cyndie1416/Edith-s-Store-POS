const express = require('express');
const router = express.Router();
const { getDatabase } = require('../models/database');
const smsService = require('../utils/smsService');

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
    address
  } = req.body;
  
  // Validation
  if (!name) {
    return res.status(400).json({ error: 'Customer name is required' });
  }
  
  const query = `
    INSERT INTO customers (name, phone, email, address)
    VALUES (?, ?, ?, ?)
  `;
  
  const params = [
    name,
    phone || null,
    email || null,
    address || null
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
    address
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
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    const params = [
      name || customer.name,
      phone !== undefined ? phone : customer.phone,
      email !== undefined ? email : customer.email,
      address !== undefined ? address : customer.address,
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

// Get customer credit history
router.get('/:id/credit-history', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  
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
      SELECT 
        ct.*,
        ct.amount,
        ct.description,
        ct.created_at,
        CASE 
          WHEN ct.transaction_type = 'credit' THEN ct.amount
          WHEN ct.transaction_type = 'payment' THEN -ct.amount
          ELSE 0
        END as balance_change
      FROM credit_transactions ct
      WHERE ct.customer_id = ?
      ORDER BY ct.created_at DESC
    `;
    
    db.all(query, [id], (err, transactions) => {
      if (err) {
        console.error('Error fetching credit history:', err);
        return res.status(500).json({ error: 'Failed to fetch credit history' });
      }
      
             // Return transactions without balance calculation
       const transactionsWithBalance = transactions;
      
      res.json({ transactions: transactionsWithBalance });
    });
  });
});

// Add credit transaction (simplified version for frontend)
router.post('/credit-transaction', (req, res) => {
  const db = getDatabase();
  const {
    customer_id,
    type,
    amount,
    description
  } = req.body;
  
  // Validation
  if (!customer_id || !type || !amount || !description) {
    return res.status(400).json({ error: 'Customer ID, type, amount, and description are required' });
  }
  
  if (!['add', 'deduct'].includes(type)) {
    return res.status(400).json({ error: 'Invalid transaction type. Use "add" or "deduct"' });
  }
  
  // Start transaction
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Check if customer exists
    db.get('SELECT * FROM customers WHERE id = ?', [customer_id], (err, customer) => {
      if (err) {
        db.run('ROLLBACK');
        console.error('Error checking customer:', err);
        return res.status(500).json({ error: 'Failed to check customer' });
      }
      
      if (!customer) {
        db.run('ROLLBACK');
        return res.status(404).json({ error: 'Customer not found' });
      }
      
      // Map frontend types to database types
      const transactionType = type === 'add' ? 'credit' : 'payment';
      
      // Insert credit transaction
      const transactionQuery = `
        INSERT INTO credit_transactions (
          customer_id, transaction_type, amount, description
        ) VALUES (?, ?, ?, ?)
      `;
      
      const transactionParams = [
        customer_id,
        transactionType,
        parseFloat(amount),
        description
      ];
      
      db.run(transactionQuery, transactionParams, function(err) {
        if (err) {
          db.run('ROLLBACK');
          console.error('Error creating transaction:', err);
          return res.status(500).json({ error: 'Failed to create transaction' });
        }
        
        // Update customer balance
        let balanceChange = 0;
        if (type === 'add') {
          balanceChange = parseFloat(amount);
        } else if (type === 'deduct') {
          balanceChange = -parseFloat(amount);
        }
        
        const balanceQuery = `
          UPDATE customers 
          SET current_balance = current_balance + ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `;
        
        db.run(balanceQuery, [balanceChange, customer_id], function(err) {
          if (err) {
            db.run('ROLLBACK');
            console.error('Error updating customer balance:', err);
            return res.status(500).json({ error: 'Failed to update customer balance' });
          }
          
          db.run('COMMIT');
          
          // Get updated customer
          db.get('SELECT * FROM customers WHERE id = ?', [customer_id], (err, updatedCustomer) => {
            if (err) {
              console.error('Error fetching updated customer:', err);
              return res.status(500).json({ error: 'Transaction created but failed to fetch customer' });
            }
            
            res.status(201).json({
              message: 'Credit transaction processed successfully',
              customer: updatedCustomer
            });
          });
        });
      });
    });
  });
});

// Send SMS notification for credit balance
router.post('/:id/send-sms', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const { message } = req.body;
  
  // Check if customer exists and has phone number
  db.get('SELECT * FROM customers WHERE id = ? AND is_active = 1', [id], (err, customer) => {
    if (err) {
      console.error('Error checking customer:', err);
      return res.status(500).json({ error: 'Failed to check customer' });
    }
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    if (!customer.phone) {
      return res.status(400).json({ error: 'Customer does not have a phone number' });
    }
    
    // Get recent credit transactions for the message
    const transactionQuery = `
      SELECT * FROM credit_transactions 
      WHERE customer_id = ? 
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    
    db.all(transactionQuery, [id], (err, transactions) => {
      if (err) {
        console.error('Error fetching transactions:', err);
        return res.status(500).json({ error: 'Failed to fetch transactions' });
      }
      
      // Generate SMS message
      const defaultMessage = generateCreditBalanceSMS(customer, transactions);
      const finalMessage = message || defaultMessage;
      
      // Send SMS using the SMS service
      smsService.sendSMS(customer.phone, finalMessage)
        .then((result) => {
          res.json({ 
            message: 'SMS sent successfully',
            phone: customer.phone,
            messageContent: finalMessage,
            service: result.service,
            simulated: result.simulated
          });
        })
        .catch(error => {
          console.error('Error sending SMS:', error);
          res.status(500).json({ error: 'Failed to send SMS' });
        });
    });
  });
});

// Helper function to generate SMS message
function generateCreditBalanceSMS(customer, transactions) {
  const balance = parseFloat(customer.current_balance || 0).toFixed(2);
  let message = `Hi ${customer.name},\n\nYour current credit balance is ₱${balance}.\n\n`;
  
  if (transactions.length > 0) {
    message += 'Recent transactions:\n';
    transactions.slice(0, 3).forEach(transaction => {
      const date = new Date(transaction.created_at).toLocaleDateString();
      const amount = parseFloat(transaction.amount).toFixed(2);
      const type = ['credit', 'debit'].includes(transaction.transaction_type) ? 'Added' : 'Deducted';
      message += `${date}: ${type} ₱${amount}\n`;
    });
  }
  
  message += '\nThank you for your business!\nEdith\'s Store';
  return message;
}



module.exports = router;
