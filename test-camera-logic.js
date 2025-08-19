// Test the camera access logic
const testHostname = '192.168.0.102';

// Test the logic that's in the barcode scanner
const isLocalhost = testHostname === 'localhost' || testHostname === '127.0.0.1';
const isLocalNetwork = testHostname.startsWith('192.168.') || testHostname.startsWith('10.') || testHostname.startsWith('172.');
const isSecureContext = false; // http protocol

console.log('Testing camera access logic:');
console.log(`Hostname: ${testHostname}`);
console.log(`Is Localhost: ${isLocalhost}`);
console.log(`Is Local Network: ${isLocalNetwork}`);
console.log(`Is Secure Context: ${isSecureContext}`);
console.log(`Will Allow Camera: ${isSecureContext || isLocalhost || isLocalNetwork}`);

// Test different hostnames
const testCases = [
  'localhost',
  '127.0.0.1',
  '192.168.0.102',
  '192.168.1.100',
  '10.0.0.1',
  '172.16.0.1',
  'example.com'
];

console.log('\nTesting all cases:');
testCases.forEach(hostname => {
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  const isLocalNetwork = hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.');
  const isSecureContext = false;
  const willAllowCamera = isSecureContext || isLocalhost || isLocalNetwork;
  
  console.log(`${hostname}: ${willAllowCamera ? '✅ ALLOW' : '❌ BLOCK'}`);
});
