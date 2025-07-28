// Simple script to create the ALLOW_APP_INSTALL feature flag
// Run with: node create-install-flag.js

const http = require('http');

const data = JSON.stringify({
  name: 'ALLOW_APP_INSTALL',
  enabled: false, // Start disabled
  description: 'Controls whether PWA installation features are visible and functional'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/feature-flags',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', responseData);
    
    if (res.statusCode === 200) {
      console.log('✅ ALLOW_APP_INSTALL feature flag created successfully!');
      console.log('💡 The flag is disabled by default. Enable it via the admin panel or API to show install features.');
    } else {
      console.log('❌ Failed to create feature flag');
    }
  });
});

req.on('error', (error) => {
  console.error('Error creating feature flag:', error.message);
  console.log('Make sure the server is running on localhost:5000');
});

req.write(data);
req.end();