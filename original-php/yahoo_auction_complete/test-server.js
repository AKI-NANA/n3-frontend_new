const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    success: true,
    message: 'Test server is running',
    timestamp: new Date().toISOString()
  }));
});

server.listen(3001, () => {
  console.log('Test server running on port 3001');
});
