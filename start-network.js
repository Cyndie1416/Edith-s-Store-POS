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
  console.log('🌐 Network Configuration:');
  console.log(`📱 Your local IP address: ${localIP}`);
  console.log(`🔗 Access from other devices:`);
  console.log(`   Frontend: http://${localIP}:3000`);
  console.log(`   Backend API: http://${localIP}:5000/api`);
  console.log(`   Health check: http://${localIP}:5000/api/health`);
  console.log('');
  console.log('🚀 Starting server for network access...');
  console.log('⚠️  Make sure your firewall allows connections on ports 3000 and 5000');
  console.log('');
  
  // Start the server
  const server = spawn('npm', ['run', 'dev'], { 
    stdio: 'inherit',
    shell: true 
  });
  
  server.on('error', (error) => {
    console.error('❌ Failed to start server:', error);
  });
  
  server.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
  });
  
} else {
  console.error('❌ Could not determine local IP address');
  console.log('Please check your network connection and try again.');
}
