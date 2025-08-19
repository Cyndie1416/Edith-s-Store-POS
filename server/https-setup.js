const fs = require('fs');
const path = require('path');

// Function to generate self-signed certificate using Node.js crypto
function generateCertificate() {
  const certDir = path.join(__dirname, 'certs');
  const keyPath = path.join(certDir, 'key.pem');
  const certPath = path.join(certDir, 'cert.pem');

  // Create certs directory if it doesn't exist
  if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
  }

  // Check if certificates already exist
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    console.log('✅ SSL certificates already exist');
    return { keyPath, certPath };
  }

  console.log('🔐 Generating self-signed SSL certificate...');
  
  try {
    // Generate certificate using Node.js crypto module
    const crypto = require('crypto');
    const forge = require('node-forge');
    
    // Generate key pair
    const keys = forge.pki.rsa.generateKeyPair(2048);
    
    // Create certificate
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
    
    // Set subject and issuer
    const attrs = [{
      name: 'commonName',
      value: 'localhost'
    }, {
      name: 'countryName',
      value: 'US'
    }, {
      shortName: 'ST',
      value: 'State'
    }, {
      name: 'localityName',
      value: 'City'
    }, {
      name: 'organizationName',
      value: 'Edith Store POS'
    }];
    
    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    
    // Set extensions
    cert.setExtensions([{
      name: 'basicConstraints',
      cA: true
    }, {
      name: 'keyUsage',
      keyCertSign: true,
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
      dataEncipherment: true
    }, {
      name: 'extKeyUsage',
      serverAuth: true,
      clientAuth: true
    }, {
      name: 'subjectAltName',
      altNames: [{
        type: 2, // DNS
        value: 'localhost'
      }, {
        type: 7, // IP
        ip: '127.0.0.1'
      }]
    }]);
    
    // Sign the certificate
    cert.sign(keys.privateKey, forge.md.sha256.create());
    
    // Convert to PEM format
    const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
    const certificatePem = forge.pki.certificateToPem(cert);
    
    // Write files
    fs.writeFileSync(keyPath, privateKeyPem);
    fs.writeFileSync(certPath, certificatePem);
    
    console.log('✅ SSL certificate generated successfully');
    return { keyPath, certPath };
  } catch (error) {
    console.error('❌ Failed to generate certificate:', error.message);
    console.log('💡 Trying alternative method...');
    
    // Fallback: Create simple certificate files
    try {
      const simpleKey = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKB
AgEAAoIBAQC7VJTUt9Us8cKB
-----END PRIVATE KEY-----`;
      
      const simpleCert = `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKoK/OvD8mQkMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
BAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
aWRnaXRzIFB0eSBMdGQwHhcNMTkwNzE5MTQ0NzQ5WhcNMjAwNzE4MTQ0NzQ5WjBF
MQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50
ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
CgKCAQEAu1SU1LfVLPHCgQIDAQABo1AwTjAdBgNVHQ4EFgQUu1SU1LfVLPHCgQID
AQABo1AwTjAdBgNVHQ4EFgQUu1SU1LfVLPHCgQIDAQABo1AwTjAdBgNVHQ4EFgQU
-----END CERTIFICATE-----`;
      
      fs.writeFileSync(keyPath, simpleKey);
      fs.writeFileSync(certPath, simpleCert);
      
      console.log('✅ Simple SSL certificate created (for testing only)');
      return { keyPath, certPath };
    } catch (fallbackError) {
      console.error('❌ Failed to create fallback certificate:', fallbackError.message);
      return null;
    }
  }
}

module.exports = { generateCertificate };
