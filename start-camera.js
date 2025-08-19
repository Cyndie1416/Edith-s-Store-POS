const { spawn } = require('child_process');

console.log('📷 Starting Camera-Ready Setup...');
console.log('🔒 HTTPS Backend + React Frontend');
console.log('');

// Start HTTPS backend
console.log('🚀 Starting HTTPS backend...');
const httpsServer = spawn('node', ['server/https-simple.js'], {
  stdio: 'inherit',
  shell: true
});

// Wait 3 seconds for HTTPS server to start
setTimeout(() => {
  console.log('🌐 Starting React frontend...');
  const reactApp = spawn('npm', ['run', 'client'], {
    stdio: 'inherit',
    shell: true
  });

  // Handle cleanup
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    httpsServer.kill('SIGINT');
    reactApp.kill('SIGINT');
    process.exit(0);
  });

  httpsServer.on('close', (code) => {
    console.log(`❌ HTTPS server exited: ${code}`);
    reactApp.kill('SIGINT');
  });

  reactApp.on('close', (code) => {
    console.log(`❌ React app exited: ${code}`);
    httpsServer.kill('SIGINT');
  });

}, 3000);
