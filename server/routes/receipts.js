const express = require('express');
const router = express.Router();
const { getDatabase } = require('../models/database');

// Get all receipts with pagination
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    const { page = 1, limit = 20, search = '', startDate = '', endDate = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        r.id,
        r.receipt_number,
        r.receipt_type,
        r.content,
        r.sent_to,
        r.created_at,
        s.sale_number,
        s.final_amount,
        s.payment_method,
        c.name as customer_name,
        u.full_name as cashier_name
      FROM receipts r
      LEFT JOIN sales s ON r.sale_id = s.id
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON s.cashier_id = u.id
      WHERE 1=1
    `;

    const params = [];

    if (search) {
      query += ` AND (r.receipt_number LIKE ? OR s.sale_number LIKE ? OR c.name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (startDate) {
      query += ` AND DATE(r.created_at) >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND DATE(r.created_at) <= ?`;
      params.push(endDate);
    }

    query += ` ORDER BY r.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    db.all(query, params, (err, receipts) => {
      if (err) {
        console.error('Error fetching receipts:', err);
        return res.status(500).json({ error: 'Failed to fetch receipts' });
      }

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as total
        FROM receipts r
        LEFT JOIN sales s ON r.sale_id = s.id
        LEFT JOIN customers c ON s.customer_id = c.id
        WHERE 1=1
      `;

      const countParams = [];

      if (search) {
        countQuery += ` AND (r.receipt_number LIKE ? OR s.sale_number LIKE ? OR c.name LIKE ?)`;
        countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      if (startDate) {
        countQuery += ` AND DATE(r.created_at) >= ?`;
        countParams.push(startDate);
      }

      if (endDate) {
        countQuery += ` AND DATE(r.created_at) <= ?`;
        countParams.push(endDate);
      }

      db.get(countQuery, countParams, (err, result) => {
        if (err) {
          console.error('Error counting receipts:', err);
          return res.status(500).json({ error: 'Failed to count receipts' });
        }

        res.json({
          receipts,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: result.total,
            pages: Math.ceil(result.total / limit)
          }
        });
      });
    });
  } catch (error) {
    console.error('Error in receipts route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get receipt by ID
router.get('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const query = `
      SELECT 
        r.*,
        s.sale_number,
        s.final_amount,
        s.payment_method,
        c.name as customer_name,
        u.full_name as cashier_name
      FROM receipts r
      LEFT JOIN sales s ON r.sale_id = s.id
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON s.cashier_id = u.id
      WHERE r.id = ?
    `;

    db.get(query, [id], (err, receipt) => {
      if (err) {
        console.error('Error fetching receipt:', err);
        return res.status(500).json({ error: 'Failed to fetch receipt' });
      }

      if (!receipt) {
        return res.status(404).json({ error: 'Receipt not found' });
      }

      res.json({ receipt });
    });
  } catch (error) {
    console.error('Error in receipt detail route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new receipt
router.post('/', async (req, res) => {
  try {
    const db = getDatabase();
    const { sale_id, receipt_type = 'print', content, sent_to } = req.body;

    if (!sale_id) {
      return res.status(400).json({ error: 'Sale ID is required' });
    }

    const receipt_number = `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const query = `
      INSERT INTO receipts (sale_id, receipt_number, receipt_type, content, sent_to)
      VALUES (?, ?, ?, ?, ?)
    `;

    db.run(query, [sale_id, receipt_number, receipt_type, content, sent_to], function(err) {
      if (err) {
        console.error('Error creating receipt:', err);
        return res.status(500).json({ error: 'Failed to create receipt' });
      }

      res.status(201).json({
        message: 'Receipt created successfully',
        receipt_id: this.lastID,
        receipt_number
      });
    });
  } catch (error) {
    console.error('Error in create receipt route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update receipt
router.put('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { receipt_type, content, sent_to } = req.body;

    const query = `
      UPDATE receipts 
      SET receipt_type = ?, content = ?, sent_to = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    db.run(query, [receipt_type, content, sent_to, id], function(err) {
      if (err) {
        console.error('Error updating receipt:', err);
        return res.status(500).json({ error: 'Failed to update receipt' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Receipt not found' });
      }

      res.json({ message: 'Receipt updated successfully' });
    });
  } catch (error) {
    console.error('Error in update receipt route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete receipt
router.delete('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const query = 'DELETE FROM receipts WHERE id = ?';

    db.run(query, [id], function(err) {
      if (err) {
        console.error('Error deleting receipt:', err);
        return res.status(500).json({ error: 'Failed to delete receipt' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Receipt not found' });
      }

      res.json({ message: 'Receipt deleted successfully' });
    });
  } catch (error) {
    console.error('Error in delete receipt route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get receipt statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const db = getDatabase();
    const { startDate = '', endDate = '' } = req.query;

    let query = `
      SELECT 
        COUNT(*) as total_receipts,
        COUNT(CASE WHEN receipt_type = 'print' THEN 1 END) as print_receipts,
        COUNT(CASE WHEN receipt_type = 'email' THEN 1 END) as email_receipts,
        COUNT(CASE WHEN receipt_type = 'sms' THEN 1 END) as sms_receipts,
        COUNT(CASE WHEN receipt_type = 'none' THEN 1 END) as no_receipts
      FROM receipts
      WHERE 1=1
    `;

    const params = [];

    if (startDate) {
      query += ` AND DATE(created_at) >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND DATE(created_at) <= ?`;
      params.push(endDate);
    }

    db.get(query, params, (err, stats) => {
      if (err) {
        console.error('Error fetching receipt stats:', err);
        return res.status(500).json({ error: 'Failed to fetch receipt statistics' });
      }

      res.json({ stats });
    });
  } catch (error) {
    console.error('Error in receipt stats route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resend receipt
router.post('/:id/resend', async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { receipt_type, sent_to } = req.body;

    // First get the receipt details
    const getQuery = `
      SELECT r.*, s.sale_number, s.final_amount, c.name as customer_name
      FROM receipts r
      LEFT JOIN sales s ON r.sale_id = s.id
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE r.id = ?
    `;

    db.get(getQuery, [id], (err, receipt) => {
      if (err) {
        console.error('Error fetching receipt for resend:', err);
        return res.status(500).json({ error: 'Failed to fetch receipt' });
      }

      if (!receipt) {
        return res.status(404).json({ error: 'Receipt not found' });
      }

      // Update the receipt with new send details
      const updateQuery = `
        UPDATE receipts 
        SET receipt_type = ?, sent_to = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      db.run(updateQuery, [receipt_type, sent_to, id], function(err) {
        if (err) {
          console.error('Error updating receipt for resend:', err);
          return res.status(500).json({ error: 'Failed to resend receipt' });
        }

        res.json({ 
          message: 'Receipt resent successfully',
          receipt_type,
          sent_to
        });
      });
    });
  } catch (error) {
    console.error('Error in resend receipt route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
