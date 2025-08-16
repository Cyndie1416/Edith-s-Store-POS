// Edith's Store POS System Configuration

module.exports = {
  // Server Configuration
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || 'ediths-pos-super-secret-key-change-in-production',
  JWT_EXPIRES_IN: '24h',
  
  // Database Configuration
  DB_PATH: process.env.DB_PATH || './database/ediths_pos.db',
  
  // CORS Configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  
  // Default Admin User
  DEFAULT_ADMIN: {
    username: 'admin',
    password: 'admin123',
    full_name: 'Administrator',
    role: 'admin'
  }
};
