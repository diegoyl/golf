import asyncio
import socket
import struct
import json
import websockets

DSU_SERVER_IP = '127.0.0.1'
DSU_SERVER_PORT = 26762

# WebSocket forwarding target
WS_SERVER_URI = "ws://localhost:8081"

# Create UDP socket
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.settimeout(1)

# DSU handshake packet (same as emulators send)
handshake_packet = b'DSUC' + b'\x00' * 36

# DSU poll packet
poll_packet = b'DSUS' + b'\x00' * 36

# Send handshake first
sock.sendto(handshake_packet, (DSU_SERVER_IP, DSU_SERVER_PORT))
print("sending handshake")

async def forward_loop():
    async with websockets.connect(WS_SERVER_URI) as websocket:
        while True:
            try:
                # Send poll
                print("sending poll")
                sock.sendto(poll_packet, (DSU_SERVER_IP, DSU_SERVER_PORT))
                # Receive reply
                data, _ = sock.recvfrom(512)
                print(data)

                if data[:4] == b'DSUS':
                    # Parse a minimal subset (full spec is more detailed)
                    # Gyro and accel data usually start around byte 64 (varies by implementation)

                    # For demo: show first 100 bytes
                    # print(list(data[:100]))

                    # Example: get gyro float values at offsets 84, 96, 108
                    try:
                        gyro_x = struct.unpack('f', data[84:88])[0]
                        gyro_y = struct.unpack('f', data[96:100])[0]
                        gyro_z = struct.unpack('f', data[108:112])[0]
                    except:
                        gyro_x, gyro_y, gyro_z = 0, 0, 0

                    payload = {
                        "gyro": {"x": gyro_x, "y": gyro_y, "z": gyro_z}
                    }

                    await websocket.send(json.dumps(payload))
                    print("Forwarded:", payload)

            except socket.timeout:
                pass

            await asyncio.sleep(0.01)

asyncio.run(forward_loop())
