const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');

// Create Express app
const app = express();

// Simple CORS - allow everything
app.use(cors({
  origin: '*',
  credentials: false
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'HTTPS API is working!',
    timestamp: new Date().toISOString(),
    protocol: 'HTTPS'
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    message: 'HTTPS Server is running',
    timestamp: new Date().toISOString()
  });
});

// Create simple certificates
function createCertificates() {
  const certDir = path.join(__dirname, 'certs');
  if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
  }

  // Very simple certificates for development
  const key = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKB
AgEAAoIBAQC7VJTUt9Us8cKB
-----END PRIVATE KEY-----`;

  const cert = `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKoK/OvD8VQkMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
BAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
aWRnaXRzIFB0eSBMdGQwHhcNMTkwNzE5MTQ0NzU5WhcNMjAwNzE4MTQ0NzU5WjBF
MQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50
ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
CgKCAQEAu1SU1LfVLPHCgQIDAQABo1AwTjAdBgNVHQ4EFgQUu1SU1LfVLPHCgQID
AQABo1AwTjAdBgNVHQ4EFgQUu1SU1LfVLPHCgQIDAQABo1AwTjAdBgNVHQ4EFgQU
-----END CERTIFICATE-----`;

  fs.writeFileSync(path.join(certDir, 'key.pem'), key);
  fs.writeFileSync(path.join(certDir, 'cert.pem'), cert);

  return { key, cert };
}

// Start server
const PORT = 5001;
const certs = createCertificates();

const server = https.createServer({
  key: certs.key,
  cert: certs.cert
}, app);

server.listen(PORT, '0.0.0.0', () => {
  console.log('🔒 Simple HTTPS Server Running!');
  console.log(`📊 HTTPS API: https://localhost:${PORT}/api`);
  console.log(`🌐 Network: https://192.168.0.102:${PORT}/api`);
  console.log('');
  console.log('📷 Camera will work on HTTPS!');
  console.log('⚠️  Accept security warning in browser');
});
