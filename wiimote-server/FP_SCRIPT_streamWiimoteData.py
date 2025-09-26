import socket
import json

# Setup UDP
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
server_address = ('127.0.0.1', 26762)  # Adjust port if needed


def update():    
    #diagnostics.debug("pkt...")

    global offsetPitch, offsetRoll, offsetYaw
    global offsetAccelX, offsetAccelY, offsetAccelZ

    # If Home button is pressed: set calibration offsets
    if wiimote[0].buttons.button_down(WiimoteButtons.B):
        offsetPitch = wiimote[0].motionplus.pitch_left
        offsetRoll = wiimote[0].motionplus.roll_left
        offsetYaw = wiimote[0].motionplus.yaw_down

        offsetAccelX = wiimote[0].acceleration.x
        offsetAccelY = wiimote[0].acceleration.y
        offsetAccelZ = wiimote[0].acceleration.z

    # Apply offsets
    adjPitch = wiimote[0].motionplus.pitch_left - offsetPitch
    adjRoll = wiimote[0].motionplus.roll_left - offsetRoll
    adjYaw = wiimote[0].motionplus.yaw_down - offsetYaw

    adjAccelX = wiimote[0].acceleration.x - offsetAccelX
    adjAccelY = wiimote[0].acceleration.y - offsetAccelY
    adjAccelZ = wiimote[0].acceleration.z - offsetAccelZ
    
    data = {
        "accel": {
            "x": adjAccelX,
            "y": adjAccelY,
            "z": adjAccelZ
        },
        "gyro": {
            "pitch": adjPitch,
            "roll": adjRoll,
            "yaw": adjYaw
        },
        "buttons": {
            "A": wiimote[0].buttons.button_down(WiimoteButtons.A),
            "B": wiimote[0].buttons.button_down(WiimoteButtons.B),
            "DPadLeft": wiimote[0].buttons.button_down(WiimoteButtons.DPadLeft),
            "DPadRight": wiimote[0].buttons.button_down(WiimoteButtons.DPadRight),
            "DPadUp": wiimote[0].buttons.button_down(WiimoteButtons.DPadUp),
            "DPadDown": wiimote[0].buttons.button_down(WiimoteButtons.DPadDown),
            "Plus": wiimote[0].buttons.button_down(WiimoteButtons.Plus),
            "Minus": wiimote[0].buttons.button_down(WiimoteButtons.Minus),
            "Home": wiimote[0].buttons.button_down(WiimoteButtons.Home),
            "One": wiimote[0].buttons.button_down(WiimoteButtons.One),
            "Two": wiimote[0].buttons.button_down(WiimoteButtons.Two)
        }
    }
    msg = json.dumps(data).encode()
    sock.sendto(msg, server_address)


if starting:
    # --- Calibration offsets ---
    offsetPitch = 0
    offsetRoll = 0
    offsetYaw = 0
    offsetAccelX = 0
    offsetAccelY = 0
    offsetAccelZ = 0

    diagnostics.debug("____________________\nStarting!\n")
    #diagnostics.debug(wiimote[0].status)
    #wiimote[0].status.setLEDState(4, True)
    #wiimote[0].led4 = True
    #diagnostics.debug("set led 4!")
    #wiimote[0].setRumble(True)
    #diagnostics.debug("activated rumble!")

    wiimote[0].enable(WiimoteCapabilities.MotionPlus)
    wiimote[0].motionplus.update += update
    
    