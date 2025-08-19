const os = require('os');
const { spawn } = require('child_process');

// Function to get local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  return null;
}

// Get the local IP address
const localIP = getLocalIP();

if (localIP) {
  console.log('🔒 HTTPS Network Configuration:');
  console.log(`📱 Your local IP address: ${localIP}`);
  console.log(`🔗 Access from other devices:`);
  console.log(`   Frontend: https://${localIP}:3000`);
  console.log(`   Backend API: https://${localIP}:5001/api`);
  console.log(`   Health check: https://${localIP}:5001/api/health`);
  console.log('');
  console.log('🚀 Starting HTTPS server for camera access...');
  console.log('⚠️  Make sure your firewall allows connections on ports 3000 and 5001');
  console.log('');
  console.log('💡 Camera access will work on all devices with HTTPS!');
  console.log('');
  
  // Start the HTTPS server
  const httpsServer = spawn('node', ['server/https-server.js'], { 
    stdio: 'inherit',
    shell: true 
  });
  
  // Start the React frontend
  const frontend = spawn('npm', ['run', 'client'], { 
    stdio: 'inherit',
    shell: true 
  });
  
  httpsServer.on('error', (error) => {
    console.error('❌ Failed to start HTTPS server:', error);
  });
  
  frontend.on('error', (error) => {
    console.error('❌ Failed to start frontend:', error);
  });
  
  httpsServer.on('close', (code) => {
    console.log(`HTTPS server process exited with code ${code}`);
  });
  
  frontend.on('close', (code) => {
    console.log(`Frontend process exited with code ${code}`);
  });
  
} else {
  console.error('❌ Could not determine local IP address');
  console.log('Please check your network connection and try again.');
}
