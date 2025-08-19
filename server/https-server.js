const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const https = require('https');
const fs = require('fs');
require('dotenv').config();

// Import certificate generator
const { generateCertificate } = require('./https-setup');

// Import routes
const productsRouter = require('./routes/products');
const categoriesRouter = require('./routes/categories');
const salesRouter = require('./routes/sales');
const customersRouter = require('./routes/customers');
const inventoryRouter = require('./routes/inventory');
const reportsRouter = require('./routes/reports');
const authRouter = require('./routes/auth');
const receiptsRouter = require('./routes/receipts');
const notificationsRouter = require('./routes/notifications');

// Import database initialization
const { initializeDatabase } = require('./models/database');

const app = express();
const PORT = process.env.PORT || 5000;
const HTTPS_PORT = process.env.HTTPS_PORT || 5001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS configuration for HTTPS
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? ['https://yourdomain.com'] 
  : [
      'http://localhost:3000',
      'https://localhost:3000',
      'http://127.0.0.1:3000',
      'https://127.0.0.1:3000',
      // Common local network IP ranges
      /^https:\/\/192\.168\.\d{1,3}\.\d{1,3}:3000$/,
      /^https:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:3000$/,
      /^https:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}:3000$/
    ];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (process.env.NODE_ENV === 'production') {
      // In production, only allow specific domains
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
    } else {
      // In development, allow localhost and local network IPs
      if (allowedOrigins.some(allowed => {
        if (typeof allowed === 'string') {
          return allowed === origin;
        } else if (allowed instanceof RegExp) {
          return allowed.test(origin);
        }
        return false;
      })) {
        return callback(null, true);
      }
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files (for production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
}

// API Routes
app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/sales', salesRouter);
app.use('/api/customers', customersRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/auth', authRouter);
app.use('/api/receipts', receiptsRouter);
app.use('/api/notifications', notificationsRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Edith\'s Store POS API is running (HTTPS)',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    protocol: 'HTTPS'
  });
});

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize database and start HTTPS server
async function startHTTPSServer() {
  try {
    await initializeDatabase();
    console.log('✅ Database initialized successfully');
    
    // Generate SSL certificate
    const certs = generateCertificate();
    if (!certs) {
      console.error('❌ Failed to generate SSL certificate');
      process.exit(1);
    }
    
    // Create HTTPS server
    const httpsServer = https.createServer({
      key: fs.readFileSync(certs.keyPath),
      cert: fs.readFileSync(certs.certPath)
    }, app);
    
    httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
      console.log(`🔒 Edith's Store POS HTTPS Server running on port ${HTTPS_PORT}`);
      console.log(`📊 API available at https://localhost:${HTTPS_PORT}/api`);
      console.log(`🌐 Network access: https://YOUR_IP_ADDRESS:${HTTPS_PORT}/api`);
      console.log(`🏥 Health check: https://localhost:${HTTPS_PORT}/api/health`);
      console.log('');
      console.log('⚠️  Note: You may see a security warning in your browser.');
      console.log('   Click "Advanced" and "Proceed to localhost (unsafe)" to continue.');
    });
  } catch (error) {
    console.error('❌ Failed to start HTTPS server:', error);
    process.exit(1);
  }
}

startHTTPSServer();

module.exports = app;
