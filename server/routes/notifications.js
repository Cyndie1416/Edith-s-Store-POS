const express = require('express');
const router = express.Router();
const { getDatabase } = require('../models/database');
const { checkAndGenerateLowStockNotifications } = require('../utils/notificationHelper');

// Get all notifications for a user
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    const { user_id, limit = 50, offset = 0, unread_only = false } = req.query;
    
    let query = `
      SELECT n.*, u.username as user_name
      FROM notifications n
      LEFT JOIN users u ON n.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (user_id) {
      query += ' AND n.user_id = ?';
      params.push(user_id);
    }
    
    if (unread_only === 'true') {
      query += ' AND n.read_status = 0';
    }
    
    query += ' ORDER BY n.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    db.all(query, params, (err, notifications) => {
      if (err) {
        console.error('Error fetching notifications:', err);
        return res.status(500).json({ error: 'Failed to fetch notifications' });
      }
      
      res.json(notifications);
    });
  } catch (error) {
    console.error('Error in notifications GET:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get unread count
router.get('/unread-count', async (req, res) => {
  try {
    const db = getDatabase();
    const { user_id } = req.query;
    
    let query = 'SELECT COUNT(*) as count FROM notifications WHERE read_status = 0';
    const params = [];
    
    if (user_id) {
      query += ' AND user_id = ?';
      params.push(user_id);
    }
    
    db.get(query, params, (err, result) => {
      if (err) {
        console.error('Error fetching unread count:', err);
        return res.status(500).json({ error: 'Failed to fetch unread count' });
      }
      
      res.json({ unread_count: result.count });
    });
  } catch (error) {
    console.error('Error in unread count GET:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new notification
router.post('/', async (req, res) => {
  try {
    const db = getDatabase();
    const { type, title, message, priority = 'medium', user_id, reference_id, reference_type } = req.body;
    
    if (!type || !title || !message) {
      return res.status(400).json({ error: 'Type, title, and message are required' });
    }
    
    const query = `
      INSERT INTO notifications (type, title, message, priority, user_id, reference_id, reference_type)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.run(query, [type, title, message, priority, user_id, reference_id, reference_type], function(err) {
      if (err) {
        console.error('Error creating notification:', err);
        return res.status(500).json({ error: 'Failed to create notification' });
      }
      
      // Get the created notification
      db.get('SELECT * FROM notifications WHERE id = ?', [this.lastID], (err, notification) => {
        if (err) {
          console.error('Error fetching created notification:', err);
          return res.status(500).json({ error: 'Failed to fetch created notification' });
        }
        
        res.status(201).json(notification);
      });
    });
  } catch (error) {
    console.error('Error in notifications POST:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark notification as read
router.patch('/:id/read', async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    
    db.run('UPDATE notifications SET read_status = 1 WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('Error marking notification as read:', err);
        return res.status(500).json({ error: 'Failed to mark notification as read' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      
      res.json({ message: 'Notification marked as read' });
    });
  } catch (error) {
    console.error('Error in mark as read PATCH:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark all notifications as read
router.patch('/mark-all-read', async (req, res) => {
  try {
    const db = getDatabase();
    const { user_id } = req.body;
    
    let query = 'UPDATE notifications SET read_status = 1';
    const params = [];
    
    if (user_id) {
      query += ' WHERE user_id = ?';
      params.push(user_id);
    }
    
    db.run(query, params, function(err) {
      if (err) {
        console.error('Error marking all notifications as read:', err);
        return res.status(500).json({ error: 'Failed to mark notifications as read' });
      }
      
      res.json({ message: `${this.changes} notifications marked as read` });
    });
  } catch (error) {
    console.error('Error in mark all read PATCH:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a notification
router.delete('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    
    db.run('DELETE FROM notifications WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('Error deleting notification:', err);
        return res.status(500).json({ error: 'Failed to delete notification' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      
      res.json({ message: 'Notification deleted successfully' });
    });
  } catch (error) {
    console.error('Error in notifications DELETE:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clear all notifications
router.delete('/', async (req, res) => {
  try {
    const db = getDatabase();
    const { user_id } = req.query;
    
    let query = 'DELETE FROM notifications';
    const params = [];
    
    if (user_id) {
      query += ' WHERE user_id = ?';
      params.push(user_id);
    }
    
    db.run(query, params, function(err) {
      if (err) {
        console.error('Error clearing notifications:', err);
        return res.status(500).json({ error: 'Failed to clear notifications' });
      }
      
      res.json({ message: `${this.changes} notifications cleared` });
    });
  } catch (error) {
    console.error('Error in clear notifications DELETE:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate low stock notifications
router.post('/generate-low-stock', async (req, res) => {
  try {
    const result = await checkAndGenerateLowStockNotifications();
    res.json({ 
      message: `Generated ${result.notifications_created} low stock notifications`,
      products_checked: result.products_checked
    });
  } catch (error) {
    console.error('Error in generate low stock notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



module.exports = router;
