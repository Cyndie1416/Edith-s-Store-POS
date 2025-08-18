const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const dbPath = path.join(__dirname, 'database/ediths_pos.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
  } else {
    console.log('✅ Connected to SQLite database');
  }
});

// Check products table
console.log('\n=== Checking Products Table ===');
db.all('SELECT id, name, is_active, created_at FROM products ORDER BY id', (err, rows) => {
  if (err) {
    console.error('Error querying products:', err);
  } else {
    console.log('Total products in database:', rows.length);
    rows.forEach(row => {
      console.log(`ID: ${row.id}, Name: ${row.name}, Active: ${row.is_active}, Created: ${row.created_at}`);
    });
  }
  
  // Close database connection
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
  });
});
