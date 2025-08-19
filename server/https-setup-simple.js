const fs = require('fs');
const path = require('path');
const https = require('https');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import your existing routes
const productsRouter = require('./routes/products');
const categoriesRouter = require('./routes/categories');
const salesRouter = require('./routes/sales');
const customersRouter = require('./routes/customers');
const inventoryRouter = require('./routes/inventory');
const reportsRouter = require('./routes/reports');
const authRouter = require('./routes/auth');
const receiptsRouter = require('./routes/receipts');
const notificationsRouter = require('./routes/notifications');

const PORT = 5001;
const HTTPS_PORT = 5001;

// Create simple self-signed certificates
function createSimpleCertificates() {
  const certDir = path.join(__dirname, 'certs');
  
  // Create certs directory if it doesn't exist
  if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
  }

  // Simple hardcoded certificates for development
  const privateKey = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKB
AgEAAoIBAQC7VJTUt9Us8cKB
-----END PRIVATE KEY-----`;

  const certificate = `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKoK/OvD8VQkMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
BAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
aWRnaXRzIFB0eSBMdGQwHhcNMTkwNzE5MTQ0NzU5WhcNMjAwNzE4MTQ0NzU5WjBF
MQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50
ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
CgKCAQEAu1SU1LfVLPHCgQIDAQABo1AwTjAdBgNVHQ4EFgQUu1SU1LfVLPHCgQID
AQABo1AwTjAdBgNVHQ4EFgQUu1SU1LfVLPHCgQIDAQABo1AwTjAdBgNVHQ4EFgQU
-----END CERTIFICATE-----`;

  // Write certificates to files
  fs.writeFileSync(path.join(certDir, 'private-key.pem'), privateKey);
  fs.writeFileSync(path.join(certDir, 'certificate.pem'), certificate);

  console.log('✅ Simple certificates created');
  return {
    key: privateKey,
    cert: certificate
  };
}

// Create Express app
const app = express();

// Trust proxy for rate limiting
app.set('trust proxy', 1);

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
app.use(cors({
  origin: true, // Allow all origins
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
    message: 'Edith\'s Store POS HTTPS API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    protocol: 'HTTPS'
  });
});

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

// Start HTTPS server
function startHttpsServer() {
  try {
    // Create certificates
    const certs = createSimpleCertificates();
    
    // Create HTTPS server
    const httpsServer = https.createServer({
      key: certs.key,
      cert: certs.cert
    }, app);

    // Get local IP address
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    let localIP = 'localhost';
    
    for (const name of Object.keys(networkInterfaces)) {
      for (const interface of networkInterfaces[name]) {
        if (interface.family === 'IPv4' && !interface.internal) {
          localIP = interface.address;
          break;
        }
      }
      if (localIP !== 'localhost') break;
    }

    httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
      console.log('🔒 HTTPS Server Setup Complete!');
      console.log(`🚀 Edith's Store POS HTTPS Server running on port ${HTTPS_PORT}`);
      console.log(`📊 HTTPS API available at https://localhost:${HTTPS_PORT}/api`);
      console.log(`🌐 Network HTTPS access: https://${localIP}:${HTTPS_PORT}/api`);
      console.log(`🏥 Health check: https://localhost:${HTTPS_PORT}/api/health`);
      console.log('');
      console.log('📱 To access from other devices:');
      console.log(`   Frontend: http://${localIP}:3000`);
      console.log(`   Backend: https://${localIP}:${HTTPS_PORT}/api`);
      console.log('');
      console.log('⚠️  IMPORTANT: Accept the security warning in your browser');
      console.log('   This is a self-signed certificate for local development');
    });

  } catch (error) {
    console.error('❌ Failed to start HTTPS server:', error);
    process.exit(1);
  }
}

// Start the server
startHttpsServer();

module.exports = app;
