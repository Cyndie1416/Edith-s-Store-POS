const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDatabase } = require('../models/database');

// Login
router.post('/login', (req, res) => {
  const db = getDatabase();
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  const query = 'SELECT * FROM users WHERE username = ? AND role != "inactive"';
  
  db.get(query, [username], async (err, user) => {
    if (err) {
      console.error('Error during login:', err);
      return res.status(500).json({ error: 'Login failed' });
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    try {
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
      
      // Generate JWT token
      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          role: user.role,
          full_name: user.full_name
        },
        process.env.JWT_SECRET || 'ediths-pos-secret-key',
        { expiresIn: '24h' }
      );
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      
      res.json({
        message: 'Login successful',
        user: userWithoutPassword,
        token
      });
    } catch (error) {
      console.error('Error comparing passwords:', error);
      return res.status(500).json({ error: 'Login failed' });
    }
  });
});

// Register new user
router.post('/register', async (req, res) => {
  const db = getDatabase();
  const { username, password, full_name, role = 'cashier' } = req.body;
  
  if (!username || !password || !full_name) {
    return res.status(400).json({ error: 'Username, password, and full name are required' });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }
  
  try {
    // Check if username already exists
    db.get('SELECT id FROM users WHERE username = ?', [username], async (err, existingUser) => {
      if (err) {
        console.error('Error checking existing user:', err);
        return res.status(500).json({ error: 'Registration failed' });
      }
      
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Insert new user
      const query = `
        INSERT INTO users (username, password, full_name, role)
        VALUES (?, ?, ?, ?)
      `;
      
      db.run(query, [username, hashedPassword, full_name, role], function(err) {
        if (err) {
          console.error('Error creating user:', err);
          return res.status(500).json({ error: 'Registration failed' });
        }
        
        // Get the created user
        db.get('SELECT id, username, full_name, role, created_at FROM users WHERE id = ?', [this.lastID], (err, newUser) => {
          if (err) {
            console.error('Error fetching created user:', err);
            return res.status(500).json({ error: 'User created but failed to fetch' });
          }
          
          res.status(201).json({
            message: 'User registered successfully',
            user: newUser
          });
        });
      });
    });
  } catch (error) {
    console.error('Error during registration:', error);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// Get current user profile
router.get('/profile', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ediths-pos-secret-key');
    const db = getDatabase();
    
    const query = 'SELECT id, username, full_name, role, created_at FROM users WHERE id = ?';
    
    db.get(query, [decoded.id], (err, user) => {
      if (err) {
        console.error('Error fetching user profile:', err);
        return res.status(500).json({ error: 'Failed to fetch profile' });
      }
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json(user);
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// Update user profile
router.put('/profile', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const { full_name, current_password, new_password } = req.body;
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ediths-pos-secret-key');
    const db = getDatabase();
    
    // Get current user
    db.get('SELECT * FROM users WHERE id = ?', [decoded.id], async (err, user) => {
      if (err) {
        console.error('Error fetching user:', err);
        return res.status(500).json({ error: 'Failed to fetch user' });
      }
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // If changing password, verify current password
      if (new_password) {
        if (!current_password) {
          return res.status(400).json({ error: 'Current password is required to change password' });
        }
        
        const isValidPassword = await bcrypt.compare(current_password, user.password);
        if (!isValidPassword) {
          return res.status(400).json({ error: 'Current password is incorrect' });
        }
        
        if (new_password.length < 6) {
          return res.status(400).json({ error: 'New password must be at least 6 characters long' });
        }
      }
      
      // Update user
      let query = 'UPDATE users SET full_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      let params = [full_name || user.full_name, decoded.id];
      
      if (new_password) {
        const hashedPassword = await bcrypt.hash(new_password, 10);
        query = 'UPDATE users SET full_name = ?, password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        params = [full_name || user.full_name, hashedPassword, decoded.id];
      }
      
      db.run(query, params, function(err) {
        if (err) {
          console.error('Error updating user:', err);
          return res.status(500).json({ error: 'Failed to update profile' });
        }
        
        // Get updated user
        db.get('SELECT id, username, full_name, role, created_at FROM users WHERE id = ?', [decoded.id], (err, updatedUser) => {
          if (err) {
            console.error('Error fetching updated user:', err);
            return res.status(500).json({ error: 'Profile updated but failed to fetch' });
          }
          
          res.json({
            message: 'Profile updated successfully',
            user: updatedUser
          });
        });
      });
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// Get all users (admin only)
router.get('/users', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ediths-pos-secret-key');
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const db = getDatabase();
    const query = 'SELECT id, username, full_name, role, created_at, updated_at FROM users ORDER BY created_at DESC';
    
    db.all(query, (err, users) => {
      if (err) {
        console.error('Error fetching users:', err);
        return res.status(500).json({ error: 'Failed to fetch users' });
      }
      
      res.json(users);
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// Update user role (admin only)
router.put('/users/:id/role', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const { id } = req.params;
  const { role } = req.body;
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  if (!role || !['admin', 'cashier', 'inactive'].includes(role)) {
    return res.status(400).json({ error: 'Valid role is required' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ediths-pos-secret-key');
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const db = getDatabase();
    const query = 'UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    
    db.run(query, [role, id], function(err) {
      if (err) {
        console.error('Error updating user role:', err);
        return res.status(500).json({ error: 'Failed to update user role' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ message: 'User role updated successfully' });
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// Verify token middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ediths-pos-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Admin only middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = router;
module.exports.verifyToken = verifyToken;
module.exports.requireAdmin = requireAdmin;
