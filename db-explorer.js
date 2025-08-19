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
db.all('SELECT id, name, barcode, price, stock_quantity, is_active FROM products ORDER BY id', (err, rows) => {
  if (err) {
    console.error('Error querying products:', err);
  } else {
    console.log('Total products in database:', rows.length);
    rows.forEach(row => {
      console.log(`ID: ${row.id}, Name: ${row.name}, Barcode: ${row.barcode || 'NULL'}, Price: ${row.price}, Stock: ${row.stock_quantity}, Active: ${row.is_active}`);
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
