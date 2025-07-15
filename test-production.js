const express = require('express');
const path = require('path');

const app = express();
const port = 3001;

// Serve static files from dist/public
app.use(express.static(path.join(__dirname, 'dist/public')));

// Handle all routes by serving index.html (SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/public/index.html'));
});

app.listen(port, () => {
  console.log(`Production server running at http://localhost:${port}`);
  console.log('Test the PWA by:');
  console.log('1. Opening the URL in browser');
  console.log('2. Installing the PWA');
  console.log('3. Disconnecting internet');
  console.log('4. Opening the installed PWA');
});