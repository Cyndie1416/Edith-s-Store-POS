// Test script to verify camera access logic
function testCameraAccess() {
  const testUrls = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://192.168.0.102:3000',
    'http://192.168.1.100:3000',
    'http://10.0.0.1:3000',
    'http://172.16.0.1:3000',
    'https://example.com:3000'
  ];

  testUrls.forEach(url => {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const protocol = urlObj.protocol;
    
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isLocalNetwork = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(hostname);
    const isSecureContext = protocol === 'https:';
    
    const shouldAllowCamera = isSecureContext || isLocalhost || isLocalNetwork;
    
    console.log(`${url}:`);
    console.log(`  Hostname: ${hostname}`);
    console.log(`  Protocol: ${protocol}`);
    console.log(`  Is Localhost: ${isLocalhost}`);
    console.log(`  Is Local Network: ${isLocalNetwork}`);
    console.log(`  Is Secure: ${isSecureContext}`);
    console.log(`  Should Allow Camera: ${shouldAllowCamera}`);
    console.log('');
  });
}

testCameraAccess();
