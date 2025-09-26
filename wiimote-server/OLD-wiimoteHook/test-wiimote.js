const dgram = require('dgram');
const client = dgram.createSocket('udp4');

const LOCAL_PORT = 58320; // Your chosen client port
const SERVER_PORT = 26762; // WiimoteHook listening port
const SERVER_IP = '127.0.0.1';

const handshakePacket = Buffer.from('4453554300000000000000000000000000000000000000000000000000000000', 'hex');

client.on('message', (msg) => {
  console.log('✅ Received reply:', msg.toString('hex'));
});

// Bind to our local port before sending
client.bind(LOCAL_PORT, () => {
  console.log(`🔗 UDP client bound on port ${LOCAL_PORT}`);

  // Send handshake
  client.send(handshakePacket, SERVER_PORT, SERVER_IP, () => {
    console.log('🤝 Sent handshake');

    // Then start sending "poll" packets if needed
    // Here: reuse the same PadTest-style "DSUS" packet or proper generated packet
  });
});
