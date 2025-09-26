const dgram = require('dgram');
const server = dgram.createSocket('udp4');
const PORT = 26762; // Same as your FP

server.on('message', (msg, rinfo) => {
  const data = JSON.parse(msg);
  console.log("📥 Received:", data);
});

server.bind(PORT, () => {
  console.log("✅ UDP server listening on port "+PORT);
});
