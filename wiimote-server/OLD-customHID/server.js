const http = require('http');
const fs = require('fs');
const path = require('path');
const HID = require('node-hid');
const WebSocket = require('ws');

const HTTP_PORT = 8080;
const WS_PORT = 8081;

// Serve debug page
const server = http.createServer((req, res) => {
  if (req.url === '/') {
    const filePath = path.join(__dirname, 'debug.html');
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading debug page');
        return;
      }
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.end(content);
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});
server.listen(HTTP_PORT, () => {
  console.log(`HTTP server running at http://localhost:${HTTP_PORT}`);
});

const wss = new WebSocket.Server({ port: WS_PORT });
wss.on('connection', ws => {
  console.log('✅ Browser connected to WebSocket');
});

// Wii Remote device info
const WIIMOTE_VENDOR_ID = 0x057e;
const WIIMOTE_PRODUCT_ID = 0x0306;

const devices = HID.devices();
const wiimoteInfo = devices.find(d => d.vendorId === WIIMOTE_VENDOR_ID && d.productId === WIIMOTE_PRODUCT_ID);

if (!wiimoteInfo) {
  console.error('❌ Wii Remote not found. Make sure it is connected and paired!');
  process.exit(1);
} else {
  console.error('✅ Wii Remote paired!');

}

const wiimote = new HID.HID(wiimoteInfo.path);

const sleep = ms => new Promise(res => setTimeout(res, ms));
wiimote.write([0x00, 0x11, 0x10]);

const sleepTime = 600;
async function initializeWiimote() {
  await sleep(sleepTime*2);
  wiimote.write([0x00, 0x11, 0x60]);
  await sleep(sleepTime*2);

  wiimote.write([0x00, 0x16, 0x04]);
  await sleep(sleepTime);

  wiimote.write([0x00, 0x18, 0x01, 0x00]);
  await sleep(sleepTime);

  wiimote.write([0x00, 0x18, 0x02, 0x00]);
  await sleep(sleepTime);

  // wiimote.write([0x00, 0x12, 0x31]);
  wiimote.write([0x00, 0x12, 0x37]);
  await sleep(sleepTime);

  wiimote.write([0x00, 0x11, 0x90]);
}

initializeWiimote();


// MotionPlus parsing helper
function parseMotionPlus(ext1, ext2, ext3) {
  // ext1, ext2, ext3 = bytes 7,8,9 from report
  // Extract 14-bit yaw and pitch, plus slow mode flag (simplified)

  // Slow mode flag (bit 1 of ext3)
  const slowMode = !!(ext3 & 0x02);

  // Yaw: bits 0-13 from ext1 and ext2
  const yawRaw = ((ext2 << 8) | ext1) & 0x3FFF;

  // Pitch: bits 2-15 from ext2 and ext3 shifted
  const pitchRaw = (((ext3 & 0xFC) << 6) | (ext2 >> 2)) & 0x3FFF;

  // Roll data is more complex, omit for now or add if needed

  // Convert raw to signed values (Wii raw is unsigned 14-bit)
  const toSigned14 = val => (val & 0x2000) ? val - 0x4000 : val;

  return {
    yaw: toSigned14(yawRaw),
    pitch: toSigned14(pitchRaw),
    slowMode,
  };
}

wiimote.on('data', data => {
  console.log('Raw data:', data.toString('hex'));

  if (data.length < 10) {
    console.log("\ntoo short\n")
    return
  }; // Sanity check

  const buttons = (data[2] << 8) | data[3];
  const accelX = data[4];
  const accelY = data[5];
  const accelZ = data[6];

  const ext1 = data[7];
  const ext2 = data[8];
  const ext3 = data[9];

  const gyro = parseMotionPlus(ext1, ext2, ext3);

  const payload = {
    buttons: {
      A: !!(buttons & 0x0008),
      B: !!(buttons & 0x0004),
      Plus: !!(buttons & 0x0010),
      Minus: !!(buttons & 0x0020),
      Home: !!(buttons & 0x0080),
      Up: !!(buttons & 0x0800),
      Down: !!(buttons & 0x0400),
      Left: !!(buttons & 0x0100),
      Right: !!(buttons & 0x0200),
    },
    accel: { x: accelX, y: accelY, z: accelZ },
    gyro
  };

  console.log('Data:', payload);

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(payload));
    }
  });
});

wiimote.on('error', err => {
  console.error('Wiimote error:', err);
});
