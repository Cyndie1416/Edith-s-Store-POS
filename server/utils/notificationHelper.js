const { getDatabase } = require('../models/database');

// Generate low stock notification for a specific product
const generateLowStockNotification = (productId) => {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    
    const query = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ? AND p.is_active = 1
    `;
    
    db.get(query, [productId], (err, product) => {
      if (err) {
        console.error('Error fetching product for notification:', err);
        return reject(err);
      }
      
      if (!product) {
        return reject(new Error('Product not found'));
      }
      
      if (product.stock_quantity <= product.min_stock_level) {
        const notificationQuery = `
          INSERT INTO notifications (type, title, message, priority, reference_id, reference_type)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        const notificationData = {
          type: 'lowStock',
          title: 'Low Stock Alert',
          message: `${product.name} (${product.category_name}) is running low on stock (${product.stock_quantity} remaining, minimum: ${product.min_stock_level})`,
          priority: product.stock_quantity === 0 ? 'high' : 'medium',
          reference_id: productId,
          reference_type: 'product'
        };
        
        db.run(notificationQuery, [
          notificationData.type,
          notificationData.title,
          notificationData.message,
          notificationData.priority,
          notificationData.reference_id,
          notificationData.reference_type
        ], function(err) {
          if (err) {
            console.error('Error creating low stock notification:', err);
            return reject(err);
          }
          
          resolve({
            notification_id: this.lastID,
            ...notificationData
          });
        });
      } else {
        resolve(null); // No notification needed
      }
    });
  });
};

// Generate sales notification
const generateSalesNotification = (saleId) => {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    
    const query = `
      SELECT s.*, c.name as customer_name, u.username as cashier_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON s.cashier_id = u.id
      WHERE s.id = ?
    `;
    
    db.get(query, [saleId], (err, sale) => {
      if (err) {
        console.error('Error fetching sale for notification:', err);
        return reject(err);
      }
      
      if (!sale) {
        return reject(new Error('Sale not found'));
      }
      
      const notificationQuery = `
        INSERT INTO notifications (type, title, message, priority, reference_id, reference_type)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      const notificationData = {
        type: 'sales',
        title: 'New Sale Completed',
        message: `Sale #${sale.sale_number} completed for ₱${sale.final_amount.toFixed(2)}${sale.customer_name ? ` - ${sale.customer_name}` : ''}`,
        priority: 'medium',
        reference_id: saleId,
        reference_type: 'sale'
      };
      
      db.run(notificationQuery, [
        notificationData.type,
        notificationData.title,
        notificationData.message,
        notificationData.priority,
        notificationData.reference_id,
        notificationData.reference_type
      ], function(err) {
        if (err) {
          console.error('Error creating sales notification:', err);
          return reject(err);
        }
        
        resolve({
          notification_id: this.lastID,
          ...notificationData
        });
      });
    });
  });
};

// Generate system notification
const generateSystemNotification = (title, message, priority = 'medium', referenceId = null, referenceType = null) => {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    
    const notificationQuery = `
      INSERT INTO notifications (type, title, message, priority, reference_id, reference_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const notificationData = {
      type: 'system',
      title,
      message,
      priority,
      reference_id: referenceId,
      reference_type: referenceType
    };
    
    db.run(notificationQuery, [
      notificationData.type,
      notificationData.title,
      notificationData.message,
      notificationData.priority,
      notificationData.reference_id,
      notificationData.reference_type
    ], function(err) {
      if (err) {
        console.error('Error creating system notification:', err);
        return reject(err);
      }
      
      resolve({
        notification_id: this.lastID,
        ...notificationData
      });
    });
  });
};

// Check and generate low stock notifications for all products
const checkAndGenerateLowStockNotifications = () => {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    
    const query = `
      SELECT p.id, p.name, p.stock_quantity, p.min_stock_level, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.stock_quantity <= p.min_stock_level AND p.is_active = 1
    `;
    
    db.all(query, [], (err, products) => {
      if (err) {
        console.error('Error checking low stock products:', err);
        return reject(err);
      }
      
      let notificationsCreated = 0;
      const promises = [];
      
      products.forEach(product => {
        const notificationQuery = `
          INSERT INTO notifications (type, title, message, priority, reference_id, reference_type)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        const notificationData = {
          type: 'lowStock',
          title: 'Low Stock Alert',
          message: `${product.name} (${product.category_name}) is running low on stock (${product.stock_quantity} remaining, minimum: ${product.min_stock_level})`,
          priority: product.stock_quantity === 0 ? 'high' : 'medium',
          reference_id: product.id,
          reference_type: 'product'
        };
        
        const promise = new Promise((resolve, reject) => {
          db.run(notificationQuery, [
            notificationData.type,
            notificationData.title,
            notificationData.message,
            notificationData.priority,
            notificationData.reference_id,
            notificationData.reference_type
          ], function(err) {
            if (err) {
              console.error('Error creating low stock notification:', err);
              reject(err);
            } else {
              notificationsCreated++;
              resolve();
            }
          });
        });
        
        promises.push(promise);
      });
      
      Promise.all(promises)
        .then(() => {
          resolve({
            notifications_created: notificationsCreated,
            products_checked: products.length
          });
        })
        .catch(reject);
    });
  });
};

module.exports = {
  generateLowStockNotification,
  generateSalesNotification,
  generateSystemNotification,
  checkAndGenerateLowStockNotifications
};
