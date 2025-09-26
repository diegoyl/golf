const dgram = require('dgram');
const client = dgram.createSocket('udp4');

const SERVER_PORT = 26762;
const SERVER_IP = '127.0.0.1';

const handshake = Buffer.from('4453554300000000000000000000000000000000000000000000000000000000', 'hex');
// "DSUC" header with zeros

client.send(handshake, SERVER_PORT, SERVER_IP, () => {
  console.log('Sent handshake packet');
  client.close();
});