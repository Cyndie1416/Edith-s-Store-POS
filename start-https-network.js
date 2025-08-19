const { spawn } = require('child_process');
const os = require('os');

// Get local IP address
function getLocalIP() {
  const networkInterfaces = os.networkInterfaces();
  for (const name of Object.keys(networkInterfaces)) {
    for (const interface of networkInterfaces[name]) {
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  return 'localhost';
}

const localIP = getLocalIP();

console.log('🔒 HTTPS Network Setup for Camera Access');
console.log('📱 Your local IP address:', localIP);
console.log('');
console.log('🔗 Access URLs:');
console.log(`   Frontend: http://${localIP}:3000`);
console.log(`   Backend: https://${localIP}:5001/api`);
console.log('');
console.log('📷 Camera will work on network devices!');
console.log('⚠️  Accept security warnings for self-signed certificate');
console.log('');

// Start HTTPS backend server
console.log('🚀 Starting HTTPS backend server...');
const httpsServer = spawn('node', ['server/https-setup-simple.js'], {
  stdio: 'inherit',
  shell: true
});

// Wait a moment for HTTPS server to start
setTimeout(() => {
  console.log('🌐 Starting React frontend...');
  const reactApp = spawn('npm', ['run', 'client'], {
    stdio: 'inherit',
    shell: true
  });

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down servers...');
    httpsServer.kill('SIGINT');
    reactApp.kill('SIGINT');
    process.exit(0);
  });

  httpsServer.on('close', (code) => {
    console.log(`❌ HTTPS server exited with code ${code}`);
    reactApp.kill('SIGINT');
  });

  reactApp.on('close', (code) => {
    console.log(`❌ React app exited with code ${code}`);
    httpsServer.kill('SIGINT');
  });

}, 2000);
