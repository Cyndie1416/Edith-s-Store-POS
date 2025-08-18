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
    db.serialize(async () => {
      // Temporarily disable foreign keys during initialization
      db.run('PRAGMA foreign_keys = OFF');

      // Users table (for authentication)
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          full_name TEXT NOT NULL,
          email TEXT,
          role TEXT DEFAULT 'cashier',
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Try to add email column if it doesn't exist (ignore if it already exists)
      db.run(`ALTER TABLE users ADD COLUMN email TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.warn('Warning: Could not add email column:', err.message);
        }
      });

      // Categories table
      db.run(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          is_active BOOLEAN DEFAULT 1,
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
          FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE CASCADE,
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

      // Notifications table
      db.run(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          priority TEXT DEFAULT 'medium',
          read_status BOOLEAN DEFAULT 0,
          user_id INTEGER,
          reference_id INTEGER,
          reference_type TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Create indexes for better performance
      db.run('CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)');
      db.run('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)');
      db.run('CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(created_at)');
      db.run('CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)');
      db.run('CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)');
      db.run('CREATE INDEX IF NOT EXISTS idx_credit_transactions_customer ON credit_transactions(customer_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_product ON inventory_adjustments(product_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_date ON inventory_adjustments(created_at)');
      db.run('CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type)');
      db.run('CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read_status)');
      db.run('CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at)');

      // Insert default admin user
      await insertDefaultAdmin();
      
      // Only insert sample data if tables are empty
      const categoryCount = await getTableCount('categories');
      if (categoryCount === 0) {
        console.log('📝 Inserting sample categories...');
        await insertSampleCategories();
      }
      
      const productCount = await getTableCount('products');
      if (productCount === 0) {
        console.log('📝 Inserting sample products...');
        await insertSampleProducts();
      }

      const customerCount = await getTableCount('customers');
      if (customerCount === 0) {
        console.log('📝 Inserting sample customers...');
        await insertSampleCustomers();
      }

      // Re-enable foreign keys after initialization
      db.run('PRAGMA foreign_keys = ON');
      
      console.log('✅ Database tables created successfully');
      resolve();
    });
  });
}

// Insert default admin user
async function insertDefaultAdmin() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  db.run(`
    INSERT OR IGNORE INTO users (username, password, full_name, email, role)
    VALUES (?, ?, ?, ?, ?)
  `, ['admin', hashedPassword, 'Administrator', 'admin@edithsstore.com', 'admin']);
}

// Insert sample categories
function insertSampleCategories() {
  return new Promise((resolve, reject) => {
    const categories = [
      ['Fresh Produce', 'Fresh fruits, vegetables, and herbs'],
      ['Dairy & Eggs', 'Milk, cheese, yogurt, butter, and eggs'],
      ['Meat & Seafood', 'Fresh meat, poultry, fish, and seafood products'],
      ['Pantry & Canned Goods', 'Canned foods, dry goods, pasta, rice, and staples'],
      ['Beverages & Snacks', 'Drinks, chips, candies, and snack foods']
    ];

    const stmt = db.prepare('INSERT OR IGNORE INTO categories (name, description) VALUES (?, ?)');
    categories.forEach(category => stmt.run(category));
    stmt.finalize((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Insert sample products
function insertSampleProducts() {
  return new Promise((resolve, reject) => {
    const products = [
      // Fresh Produce (category_id: 1)
      ['Fresh Apples', 'Red delicious apples', '1234567890123', 1, 45.00, 30.00, 100, 10, 'kg'],
      ['Fresh Bananas', 'Yellow bananas', '1234567890124', 1, 35.00, 25.00, 80, 10, 'kg'],
      ['Fresh Tomatoes', 'Red tomatoes', '1234567890125', 1, 40.00, 28.00, 60, 5, 'kg'],
      
      // Dairy & Eggs (category_id: 2)
      ['Fresh Milk 1L', 'Whole milk', '1234567890126', 2, 65.00, 45.00, 50, 10, 'bottle'],
      ['Eggs 12pcs', 'Fresh chicken eggs', '1234567890127', 2, 85.00, 60.00, 40, 5, 'dozen'],
      ['Cheddar Cheese', 'Block cheese', '1234567890128', 2, 120.00, 85.00, 25, 5, 'block'],
      
      // Meat & Seafood (category_id: 3)
      ['Chicken Breast', 'Fresh chicken breast', '1234567890129', 3, 180.00, 130.00, 30, 5, 'kg'],
      ['Pork Belly', 'Fresh pork belly', '1234567890130', 3, 220.00, 160.00, 20, 5, 'kg'],
      ['Fresh Fish', 'Tilapia fish', '1234567890131', 3, 150.00, 110.00, 15, 3, 'kg'],
      
      // Pantry & Canned Goods (category_id: 4)
      ['White Rice 5kg', 'Premium white rice', '1234567890132', 4, 250.00, 180.00, 25, 5, 'bag'],
      ['Canned Sardines', 'Sardines in oil', '1234567890133', 4, 45.00, 32.00, 50, 10, 'can'],
      ['Pasta Spaghetti', 'Spaghetti pasta', '1234567890134', 4, 35.00, 25.00, 40, 10, 'pack'],
      
      // Beverages & Snacks (category_id: 5)
      ['Coca Cola 330ml', 'Refreshing cola drink', '1234567890135', 5, 25.00, 18.00, 100, 20, 'bottle'],
      ['Pepsi 330ml', 'Pepsi cola drink', '1234567890136', 5, 25.00, 18.00, 90, 20, 'bottle'],
      ['Lays Classic', 'Classic potato chips', '1234567890137', 5, 35.00, 25.00, 60, 15, 'pack'],
      ['Pringles Original', 'Original potato chips', '1234567890138', 5, 45.00, 32.00, 40, 10, 'can'],
      ['Mineral Water 500ml', 'Pure mineral water', '1234567890139', 5, 15.00, 10.00, 120, 30, 'bottle']
    ];

    const stmt = db.prepare(`
      INSERT OR IGNORE INTO products 
      (name, description, barcode, category_id, price, cost_price, stock_quantity, min_stock_level, unit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    products.forEach(product => stmt.run(product));
    stmt.finalize((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Insert sample customers
function insertSampleCustomers() {
  return new Promise((resolve, reject) => {
    const customers = [
      ['John Doe', '+639123456789', 'john@email.com', '123 Main St, City', 1000.00, 0.00],
      ['Jane Smith', '+639987654321', 'jane@email.com', '456 Oak Ave, Town', 500.00, 0.00],
      ['Mike Johnson', '+639555123456', 'mike@email.com', '789 Pine Rd, Village', 750.00, 0.00]
    ];

    const stmt = db.prepare(`
      INSERT OR IGNORE INTO customers 
      (name, phone, email, address, credit_limit, current_balance)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    customers.forEach(customer => stmt.run(customer));
    stmt.finalize((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Get table count
function getTableCount(tableName) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT COUNT(*) as count FROM ${tableName}`, (err, result) => {
      if (err) reject(err);
      else resolve(result.count);
    });
  });
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
