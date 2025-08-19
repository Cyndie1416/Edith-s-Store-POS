const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔒 Setting up HTTPS for Edith\'s Store POS...');
console.log('');

// Check if node-forge is available
function checkNodeForge() {
  try {
    require('node-forge');
    console.log('✅ node-forge is available');
    return true;
  } catch (error) {
    console.log('❌ node-forge is not available');
    console.log('');
    console.log('📥 Installing node-forge...');
    try {
      const { execSync } = require('child_process');
      execSync('npm install node-forge', { stdio: 'inherit' });
      console.log('✅ node-forge installed successfully');
      return true;
    } catch (installError) {
      console.log('❌ Failed to install node-forge:', installError.message);
      return false;
    }
  }
}

// Check if certificates already exist
function checkCertificates() {
  const certDir = path.join(__dirname, 'server', 'certs');
  const keyPath = path.join(certDir, 'key.pem');
  const certPath = path.join(certDir, 'cert.pem');
  
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    console.log('✅ SSL certificates already exist');
    return true;
  }
  
  console.log('📝 SSL certificates need to be generated');
  return false;
}

// Main setup function
async function setup() {
  console.log('🔍 Checking prerequisites...');
  
  if (!checkNodeForge()) {
    return;
  }
  
  if (!checkCertificates()) {
    console.log('');
    console.log('🔐 Generating SSL certificates...');
    try {
      // Import and run certificate generation
      const { generateCertificate } = require('./server/https-setup');
      const certs = generateCertificate();
      
      if (!certs) {
        console.log('❌ Failed to generate certificates');
        return;
      }
    } catch (error) {
      console.log('❌ Error generating certificates:', error.message);
      return;
    }
  }
  
  console.log('');
  console.log('✅ HTTPS setup complete!');
  console.log('');
  console.log('🚀 To start the app with HTTPS support:');
  console.log('   npm run https');
  console.log('');
  console.log('📱 Access URLs:');
  console.log('   Local: https://localhost:3000');
  console.log('   Network: https://YOUR_IP:3000');
  console.log('');
  console.log('⚠️  Note: You may see a security warning in your browser.');
  console.log('   Click "Advanced" and "Proceed to localhost (unsafe)" to continue.');
}

setup().catch(console.error);
