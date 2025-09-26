const dgram = require('dgram');
const WebSocket = require('ws');

const udpPort = 26762; // WiimoteHook default
const wsPort = 8081;

// Create UDP socket
const udpServer = dgram.createSocket('udp4');

// Create WebSocket server
const wss = new WebSocket.Server({ port: wsPort });
console.log(`✅ WebSocket server running at ws://localhost:${wsPort}`);

wss.on('connection', ws => {
  console.log('💻 Browser connected via WebSocket');
});

// When UDP data is received from WiimoteHook
udpServer.on('message', (msg) => {
  // The UDP data format is binary from WiimoteHook. You might need to parse specific fields.

  // Simple forward raw bytes to clients as a hex string (or you can parse into JSON if needed)
  const hexData = msg.toString('hex');

  // Example console log
  console.log('🎮 Raw UDP data:', hexData);

  // Broadcast to all connected WebSocket clients
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(hexData);
    }
  });
});

udpServer.bind(udpPort, () => {
  console.log(`🎮 Listening for UDP data from WiimoteHook on port ${udpPort}`);
});
