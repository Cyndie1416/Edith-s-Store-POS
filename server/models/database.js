const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// Database file path
const dbPath = path.join(__dirname, '../../database/ediths_pos.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
  } else {
    console.log('✅ Connected to SQLite database');
  }
});

// Initialize database with all tables
async function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Enable foreign keys
      db.run('PRAGMA foreign_keys = ON');

      // Users table (for authentication)
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          full_name TEXT NOT NULL,
          role TEXT DEFAULT 'cashier',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Categories table
      db.run(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Products table
      db.run(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          barcode TEXT UNIQUE,
          category_id INTEGER,
          price DECIMAL(10,2) NOT NULL,
          cost_price DECIMAL(10,2) NOT NULL,
          stock_quantity INTEGER DEFAULT 0,
          min_stock_level INTEGER DEFAULT 5,
          unit TEXT DEFAULT 'piece',
          image_url TEXT,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES categories (id)
        )
      `);

      // Customers table (for credit management)
      db.run(`
        CREATE TABLE IF NOT EXISTS customers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          phone TEXT,
          email TEXT,
          address TEXT,
          credit_limit DECIMAL(10,2) DEFAULT 0,
          current_balance DECIMAL(10,2) DEFAULT 0,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Sales table
      db.run(`
        CREATE TABLE IF NOT EXISTS sales (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sale_number TEXT UNIQUE NOT NULL,
          customer_id INTEGER,
          total_amount DECIMAL(10,2) NOT NULL,
          tax_amount DECIMAL(10,2) DEFAULT 0,
          discount_amount DECIMAL(10,2) DEFAULT 0,
          final_amount DECIMAL(10,2) NOT NULL,
          payment_method TEXT NOT NULL,
          payment_status TEXT DEFAULT 'completed',
          cashier_id INTEGER,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES customers (id),
          FOREIGN KEY (cashier_id) REFERENCES users (id)
        )
      `);

      // Sale items table
      db.run(`
        CREATE TABLE IF NOT EXISTS sale_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sale_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL,
          unit_price DECIMAL(10,2) NOT NULL,
          total_price DECIMAL(10,2) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (sale_id) REFERENCES sales (id),
          FOREIGN KEY (product_id) REFERENCES products (id)
        )
      `);

      // Credit transactions table
      db.run(`
        CREATE TABLE IF NOT EXISTS credit_transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER NOT NULL,
          transaction_type TEXT NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          description TEXT,
          reference_id INTEGER,
          reference_type TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES customers (id)
        )
      `);

      // Inventory adjustments table
      db.run(`
        CREATE TABLE IF NOT EXISTS inventory_adjustments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL,
          adjustment_type TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          reason TEXT,
          adjusted_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products (id),
          FOREIGN KEY (adjusted_by) REFERENCES users (id)
        )
      `);

      // Receipts table
      db.run(`
        CREATE TABLE IF NOT EXISTS receipts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sale_id INTEGER NOT NULL,
          receipt_number TEXT UNIQUE NOT NULL,
          receipt_type TEXT DEFAULT 'print',
          content TEXT,
          sent_to TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (sale_id) REFERENCES sales (id)
        )
      `);

      // Create indexes for better performance
      db.run('CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)');
      db.run('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(created_at)');
      db.run('CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)');
      db.run('CREATE INDEX IF NOT EXISTS idx_credit_transactions_customer ON credit_transactions(customer_id)');

      // Insert default admin user
      insertDefaultAdmin();
      
      // Insert sample categories
      insertSampleCategories();
      
      // Insert sample products
      insertSampleProducts();

      console.log('✅ Database tables created successfully');
      resolve();
    });
  });
}

// Insert default admin user
async function insertDefaultAdmin() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  db.run(`
    INSERT OR IGNORE INTO users (username, password, full_name, role)
    VALUES (?, ?, ?, ?)
  `, ['admin', hashedPassword, 'Administrator', 'admin']);
}

// Insert sample categories
function insertSampleCategories() {
  const categories = [
    ['Beverages', 'Drinks and refreshments'],
    ['Snacks', 'Chips, candies, and snacks'],
    ['Household', 'Household items and supplies'],
    ['Personal Care', 'Personal hygiene products'],
    ['Food', 'Canned goods and food items']
  ];

  const stmt = db.prepare('INSERT OR IGNORE INTO categories (name, description) VALUES (?, ?)');
  categories.forEach(category => stmt.run(category));
  stmt.finalize();
}

// Insert sample products
function insertSampleProducts() {
  const products = [
    ['Coca Cola 330ml', 'Refreshing cola drink', '1234567890123', 1, 25.00, 18.00, 50, 5, 'bottle'],
    ['Pepsi 330ml', 'Pepsi cola drink', '1234567890124', 1, 25.00, 18.00, 45, 5, 'bottle'],
    ['Lays Classic', 'Classic potato chips', '1234567890125', 2, 35.00, 25.00, 30, 5, 'pack'],
    ['Pringles Original', 'Original potato chips', '1234567890126', 2, 45.00, 32.00, 25, 5, 'can'],
    ['Tide Detergent', 'Laundry detergent', '1234567890127', 3, 120.00, 85.00, 15, 5, 'bottle'],
    ['Colgate Toothpaste', 'Fresh mint toothpaste', '1234567890128', 4, 85.00, 60.00, 20, 5, 'tube'],
    ['Sardines in Oil', 'Canned sardines', '1234567890129', 5, 45.00, 32.00, 40, 5, 'can'],
    ['Corned Beef', 'Canned corned beef', '1234567890130', 5, 65.00, 45.00, 35, 5, 'can']
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO products 
    (name, description, barcode, category_id, price, cost_price, stock_quantity, min_stock_level, unit)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  products.forEach(product => stmt.run(product));
  stmt.finalize();
}

// Get database instance
function getDatabase() {
  return db;
}

// Close database connection
function closeDatabase() {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        reject(err);
      } else {
        console.log('✅ Database connection closed');
        resolve();
      }
    });
  });
}

module.exports = {
  initializeDatabase,
  getDatabase,
  closeDatabase
};
