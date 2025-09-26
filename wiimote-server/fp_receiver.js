const dgram = require('dgram');
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const UDP_PORT = 26762;
const WS_PORT = 8081;
const HTTP_PORT = 8080;

// Create UDP server
const udpServer = dgram.createSocket('udp4');

// Create WebSocket server
const wss = new WebSocket.Server({ port: WS_PORT });

wss.on('connection', ws => {
  console.log("\t🛜 Browser connected via WebSocket");
});

// monitoring
let firstMsg = false;
let inactivityTimer = null;
let INACTIVITY_THRESHOLD_MS = 6000; // 6 seconds initially and 2 seconds after it starts streaming


// Function to cleanly shut down everything
function shutdown() {
  console.log("\n⚠️ No packets received for 2 seconds. Shutting down...");

  udpServer.close(() => {
    console.log("UDP server closed.");
  });

  process.exit(0);
}

// Forward UDP data to WebSocket clients
udpServer.on('message', (msg) => {
  const data = JSON.parse(msg);
  if (!firstMsg) {
    console.log("\t🎉 1st Message Received!");
    firstMsg = true;
    INACTIVITY_THRESHOLD_MS = 2000; // 6 seconds initially and 2 seconds after it starts streaming
  }

  // Reset inactivity timer
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
  }
  inactivityTimer = setTimeout(shutdown, INACTIVITY_THRESHOLD_MS);


  // Broadcast to all WS clients
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
});

udpServer.bind(UDP_PORT, () => {
  console.log(`\nStarting...\n\n🔊🔊🔊 UDP server listening on port ${UDP_PORT}`);
});

// Serve debug HTML page
const server = http.createServer((req, res) => {
  // const filePath = path.join(__dirname, 'debug-old.html');
  const filePath = path.join(__dirname, 'debug.html');
  // const filePath = path.join(__dirname, 'power-demo.html');
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end('Error loading debug page');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(content);
  });
});

server.listen(HTTP_PORT, () => {
  console.log(`🏃🏃🏃 HTTP server running at http://localhost:${HTTP_PORT}`);
});
