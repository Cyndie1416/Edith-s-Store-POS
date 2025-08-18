const express = require('express');
const router = express.Router();
const { getDatabase } = require('../models/database');

// Get all categories
router.get('/', (req, res) => {
  const db = getDatabase();
  const { search } = req.query;
  
  let query = 'SELECT * FROM categories ORDER BY name';
  let params = [];
  
  if (search) {
    query = 'SELECT * FROM categories WHERE name LIKE ? OR description LIKE ? ORDER BY name';
    params = [`%${search}%`, `%${search}%`];
  }
  
  db.all(query, params, (err, categories) => {
    if (err) {
      console.error('Error fetching categories:', err);
      return res.status(500).json({ error: 'Failed to fetch categories' });
    }
    
    res.json({ categories });
  });
});

// Get category by ID
router.get('/:id', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  
  db.get('SELECT * FROM categories WHERE id = ?', [id], (err, category) => {
    if (err) {
      console.error('Error fetching category:', err);
      return res.status(500).json({ error: 'Failed to fetch category' });
    }
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json(category);
  });
});

// Create new category
router.post('/', (req, res) => {
  const db = getDatabase();
  const { name, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Category name is required' });
  }
  
  const query = 'INSERT INTO categories (name, description) VALUES (?, ?)';
  
  db.run(query, [name, description || null], function(err) {
    if (err) {
      console.error('Error creating category:', err);
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Category with this name already exists' });
      }
      return res.status(500).json({ error: 'Failed to create category' });
    }
    
    // Get the created category
    db.get('SELECT * FROM categories WHERE id = ?', [this.lastID], (err, category) => {
      if (err) {
        console.error('Error fetching created category:', err);
        return res.status(500).json({ error: 'Category created but failed to fetch' });
      }
      
      res.status(201).json(category);
    });
  });
});

// Update category
router.put('/:id', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const { name, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Category name is required' });
  }
  
  // Check if category exists
  db.get('SELECT * FROM categories WHERE id = ?', [id], (err, category) => {
    if (err) {
      console.error('Error checking category:', err);
      return res.status(500).json({ error: 'Failed to check category' });
    }
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    const query = 'UPDATE categories SET name = ?, description = ? WHERE id = ?';
    
    db.run(query, [name, description || null, id], function(err) {
      if (err) {
        console.error('Error updating category:', err);
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Category with this name already exists' });
        }
        return res.status(500).json({ error: 'Failed to update category' });
      }
      
      // Get the updated category
      db.get('SELECT * FROM categories WHERE id = ?', [id], (err, updatedCategory) => {
        if (err) {
          console.error('Error fetching updated category:', err);
          return res.status(500).json({ error: 'Category updated but failed to fetch' });
        }
        
        res.json(updatedCategory);
      });
    });
  });
});

// Delete category
router.delete('/:id', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  
  // Check if category is being used by any products
  db.get('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [id], (err, result) => {
    if (err) {
      console.error('Error checking category usage:', err);
      return res.status(500).json({ error: 'Failed to check category usage' });
    }
    
    if (result.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category. It is being used by products.',
        productCount: result.count
      });
    }
    
    // Delete the category
    db.run('DELETE FROM categories WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('Error deleting category:', err);
        return res.status(500).json({ error: 'Failed to delete category' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }
      
      res.json({ message: 'Category deleted successfully' });
    });
  });
});

// Get category with product count
router.get('/:id/products', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  
  const query = `
    SELECT c.*, COUNT(p.id) as product_count
    FROM categories c
    LEFT JOIN products p ON c.id = p.category_id AND p.is_active = 1
    WHERE c.id = ?
    GROUP BY c.id
  `;
  
  db.get(query, [id], (err, category) => {
    if (err) {
      console.error('Error fetching category with products:', err);
      return res.status(500).json({ error: 'Failed to fetch category' });
    }
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json(category);
  });
});

module.exports = router;
