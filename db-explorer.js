const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, 'database', 'ediths_pos.db');
const db = new sqlite3.Database(dbPath);

console.log('Connected to database:', dbPath);

// List all tables
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
  if (err) {
    console.error('Error listing tables:', err);
    return;
  }
  
  console.log('\n=== Tables in database ===');
  rows.forEach(row => {
    console.log('-', row.name);
  });
  
  // Show sample data from each table
  rows.forEach(table => {
    console.log(`\n=== Sample data from ${table.name} ===`);
    db.all(`SELECT * FROM ${table.name} LIMIT 5`, (err, data) => {
      if (err) {
        console.error(`Error reading from ${table.name}:`, err);
        return;
      }
      console.log(data);
    });
  });
  
  // Close database after a delay to allow queries to complete
  setTimeout(() => {
    db.close();
    console.log('\nDatabase connection closed.');
  }, 1000);
});
