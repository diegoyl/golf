import * as G from '../utils/globals.js'; // use as G.varName
import * as THREE from 'three';
import { CLUB } from "../objects/avatarObj.js";
import { CLUB_PROFILES } from '../utils/clubProfiles.js';
import { Ball } from "../objects/Ball.js";
import { CAM_MANAGER } from "./CamManager.js";
import { updateShaderLoc } from '../scenes/terrain.js';

const avDistFromBall = G.inTo(35);

export class HoleManager {
  constructor(gameManager, holeName) {
    // global pass ins
    this.GAME_MANAGER = gameManager;
    this.ball = new Ball(this, gameManager);
    CAM_MANAGER.ball = this.ball

    this.holeName = holeName;
    this.holeDone = false;
    this.holeDistance = false;


     // grid squares from 0,0 XY island plane
    this.gridXY = G.HOLE_DICT[this.holeName]["gridXY"];
    this.gridWH = G.HOLE_DICT[this.holeName]["gridWH"];

    this.pinPos = {
      x: false,
      y: false,
      z: false,
      radius: G.CUP_RADIUS
    };
    
    this.teePos = {
      x: false,
      y: false,
      z: false,
    };

    this.heightData = null;
    this.surfaceData = null;
  }

  // INITs
  async createHole() {
    // const { heightArray, width, height } = await this.loadHeightData16bit();
    // this.heightData = {
    //   data: heightArray,
    //   width: width,
    //   height: height
    // }
    const heightMapURL = `./BUMP/${this.holeName}_RAWBUMP.raw`;
    this.heightData = await G.extractFromRaw(heightMapURL, ...this.gridWH)
    
    this.surfaceData = await this.loadSurfaceData();
  }
  async loadHeightData8bit() {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.src = `./BUMP/${this.holeName}_RAWBUMP.raw`; // your decimated heightmap file path
      image.crossOrigin = "anonymous"; // if needed

      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');

        ctx.drawImage(image, 0, 0);

        const imageData = ctx.getImageData(0, 0, image.width, image.height);
        const data = imageData.data;

        const heightArray = new Float32Array(image.width * image.height);

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          // const b = data[i + 2];

          // If 16-bit encoded as (r << 8) + g:
          let height16 = (r << 8) + g; // 0–65535
          let normalizedHeight = height16 / 65535; // [0, 1]

          heightArray[i / 4] = normalizedHeight;
        }

        resolve({
          heightArray,
          width: image.width,
          height: image.height,
        });
      };

      image.onerror = (err) => {
        reject(err);
      };
    });
  }
  async loadHeightData16bit() {
    try {
      const response = await fetch(`./BUMP/${this.holeName}.raw`);
      const buffer = await response.arrayBuffer();

      // You must know the dimensions in advance or store them somewhere
      const width = this.gridWH[0] * 128*4;
      const height = this.gridWH[1] * 128*4;

      const rawData = new Uint16Array(buffer);

      if (rawData.length !== width * height) {
        throw new Error(`Raw data size does not match expected dimensions: got ${rawData.length}, expected ${width * height}`);
      }

      // Normalize to [0, 1]
      const heightArray = new Float32Array(width * height);
      for (let i = 0; i < rawData.length; i++) {
        heightArray[i] = rawData[i] / 65535;
      }

      return {
        heightArray,
        width,
        height,
      };
    } catch (err) {
      console.error("Failed to load height data:", err);
      throw err;
    }
  }

  async loadSurfaceData() {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.src = `./SURFID/${this.holeName}_SURFID.png`; // your heightmap file path
      image.crossOrigin = "anonymous"; // if needed

      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');

        ctx.drawImage(image, 0, 0);

        const imageData = ctx.getImageData(0, 0, image.width, image.height);
        const data = imageData.data;

        resolve({
          data,
          width: image.width,
          height: image.height,
        });
      };

      image.onerror = (err) => {
        reject(err);
      };
    });
  }
  
  // METHODS
  get getPinPos() {
    return new THREE.Vector3(this.pinPos.x,this.pinPos.y,this.pinPos.z)
  }

  // Before each hole begins
  setupHole(pinIdx="random", teeIdx="random") {
    console.log("HoleManager is setting up Hole")
    
    // SET PIN LOCATION
    const pins = G.HOLE_DICT[this.holeName]["pins"]
    let pinCoord;
    if (pinIdx == "random") {
      pinCoord = pins[ Math.floor( Math.random() * pins.length ) ] // select random pin
    } else {
      pinCoord = pins[ pinIdx ]
    }

    console.log("pin chosen:")
    console.log(pinCoord)
    const pinX = pinCoord[0]
    const pinZ = pinCoord[1]
    const pinY = G.getHeightAt(pinX,pinZ, this.gridXY, this.gridWH, this.heightData)
    this.pinPos.x = pinX
    this.pinPos.y = pinY
    this.pinPos.z = pinZ
    this.GAME_MANAGER.setPinLocation(this.pinPos.x,this.pinPos.y,this.pinPos.z)
    this.updateLocalPinCoord(pinX,pinZ);

    // CHOOSE TEE BOX
    
    const tees = G.HOLE_DICT[this.holeName]["tees"]
    let teeCoord;
    if (teeIdx == "random") {
      teeCoord = tees[ Math.floor( Math.random() * tees.length ) ] // select random tee
    } else {
      console.log("getting tee #"+(teeIdx+1))
      teeCoord = tees[teeIdx]
    }

    console.log("Getting tee pos:")
    const teeX = teeCoord[0]
    const teeZ = teeCoord[1]

    // TEE BALL
    this.ball.teeUp(teeX,teeZ)
    this.updateLocalBallCoord(this.ball.position.x,this.ball.position.z)

    // AIMING
    this.baseAimRad = 0
    this.userAimRad = 0

    this.setupShot()
  }
  
  // Before each shot begins
  setupShot() {
    console.log("\nSetting Up Next Shot")
    // TODO: add scale flagstick width to be visible
    // TODO: fix avatar rotation/position and club in relation to also

    this.holeDistance = G.uToYd(this.ball.position.distanceTo(this.getPinPos));
    
    // SUGGEST CLUB
    let bestClub = "driver";
    let minCarryOver = Infinity;
      console.log("choosing club")
      console.log("\thole: "+this.holeDistance)
    for (const [clubName, clubData] of Object.entries(CLUB_PROFILES)) {
      const carry = clubData.carry;
      console.log("\t"+clubName+": "+carry)
      const carryOver = carry - this.holeDistance;
      // Only consider clubs that can carry the required distance
      if (carryOver >= 0 && carryOver < minCarryOver) {
        bestClub = clubName;
        minCarryOver = carryOver;
      }
    }
    
    console.log("Chose best club:"+bestClub)
    if (CLUB.name != bestClub) {
      this.GAME_MANAGER.changeClub(bestClub);
    }

    // CALC PIN 2 TEE ANGLE
    const facePinDirection = this.ballToPinDirection()    
        
    const perpendicularDir = new THREE.Vector3(-facePinDirection.z,  0, facePinDirection.x); // 2D perpendicular on XZ plane

    // Offset from ball using perpendicular direction
    const avOffset = perpendicularDir.multiplyScalar(avDistFromBall);

    // Final avatar position
    const avX = this.ball.position.x + avOffset.x;
    const avZ = this.ball.position.z + avOffset.z; // y cus vec2

    // Set avatar position
    this.GAME_MANAGER.avatar.position.set(
      avX,
      G.getHeightAt(avX,avZ, this.gridXY, this.gridWH, this.heightData),
      avZ
    );
    this.updateLocalAvCoord(avX,avZ)

    // update straight angle to pin
    this.baseAimRad = Math.PI + Math.atan2(facePinDirection.x, facePinDirection.z); // notice X then z, so forward is -Z

    // SET CAM TO TEE
    CAM_MANAGER.setTeeCam(facePinDirection)
  }

  restartHole() { // mainly for testing
    this.GAME_MANAGER.ballInMotion = false;
    console.log(`ReStarting hole ${this.GAME_MANAGER.currentHole}`);
    this.setupHole()

    // HOLE_MANAGER.setupHole(); 
  }

  ballToPinDirection() {
    const ballPos = new THREE.Vector3(this.ball.position.x, 0, this.ball.position.z);
    const holePos = new THREE.Vector3(this.pinPos.x, 0, this.pinPos.z);
    
    // Direction from hole to ball
    const direction = new THREE.Vector3().subVectors(ballPos, holePos).normalize();

    console.log("Getting Ball-Pin direction:")
    console.log(direction)
    
    return direction
  }

  changeAim(increment) {
    console.log("AIM CLICKED")
    this.userAimRad += ( increment * (Math.PI / 180) ); // convert input to radians

    // ROTATE CAM
    CAM_MANAGER.aimCam(this.userAimRad)
  }
  processUserSwing(userSwingPower, userSwingSpin) {
    console.log("processUserSwing with "+userSwingPower+" | "+userSwingSpin)
    console.log(CLUB.name)

    // GET CLUB PROPERTIES
    const fixScale = 1;

    const drag = CLUB.drag /fixScale;
    const spinRate = CLUB.spinRate  /fixScale;
    const clubPower = CLUB.maxPower   /fixScale;

    const launchAngle = CLUB.launchAngle;
    const launchAngleRad = launchAngle * (Math.PI / 180);

    // GET USER INPUTS
    const power = userSwingPower * clubPower
    const aimAngleRad = this.userAimRad + this.baseAimRad;
    
    const minSS = CLUB.minSwingSpin;
    const maxSS = CLUB.maxSwingSpin;
    const swingSpinClamped = userSwingSpin*(maxSS-minSS) + minSS +  G.GND_SPIN_CONST
    console.log("userSwingSpin "+userSwingSpin)
    console.log("CLUB.minSwingSpin "+CLUB.minSwingSpin)
    console.log("CLUB.maxSwingSpin "+CLUB.maxSwingSpin)
    console.log("G.GND_SPIN_CONST "+G.GND_SPIN_CONST)
    console.log("swingSpinClamped "+swingSpinClamped)

    // CALC SHOT + SPIN VECTORS

      // horizontal
    const horizontalPower = Math.cos(launchAngleRad) * power;
    const vx = Math.sin(aimAngleRad) * horizontalPower;
    const vz = Math.cos(aimAngleRad) * horizontalPower;

      // vertical
    const vy = Math.sin(launchAngleRad) * power;

    const shotVel = new THREE.Vector3(vx, vy, vz);
    const shotAngleVec = new THREE.Vector3(vx, 0, vz).normalize();
    
    // Spin vector, XZ plane, perpendocular (to the right) of aim angle
    const rotateVec90 = new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(-90));
    const spinVec = shotAngleVec.clone().applyMatrix4(rotateVec90)
    

    // SWING!!!
    this.ball.strikeBall(aimAngleRad, shotVel, spinVec, spinRate, drag, swingSpinClamped);
  };

  
  updateLocalPinCoord(x,z){
    const [ locX, locZ ] = G.getLocalCoord(x,z,this.gridWH,this.gridXY)
    console.log("shadepin: "+locX+" | "+locZ);
    updateShaderLoc("pin", locX, locZ);
    // updateShaderLoc("pin", x,z);
  }
  updateLocalAvCoord(x,z){
    const [ locX, locZ ] = G.getLocalCoord(x,z,this.gridWH,this.gridXY)
    updateShaderLoc("avatar", locX, locZ);
    // updateShaderLoc("avatar", x,z);
  }
  updateLocalBallCoord(x,z){
    const [ locX, locZ ] = G.getLocalCoord(x,z,this.gridWH,this.gridXY)
    updateShaderLoc("ball", locX, locZ);
    // updateShaderLoc("ball", x,z);
  }

  updateBall() {
    this.ball.update();
    
    this.updateLocalBallCoord(this.ball.position.x,this.ball.position.z)
  }

  
  getSurfaceTypeAt(x, z) {
    
    // Surface map area in world coordinates
    const xMin = this.gridXY[0];
    const xMax = this.gridXY[0] + this.gridWH[0];
    const zMin = this.gridXY[1];
    const zMax = this.gridXY[1] + this.gridWH[1];

    // Normalize x and z within surface area
    const xNorm = (x - xMin) / (xMax - xMin);
    const zNorm = (z - zMin) / (zMax - zMin);

    // Clamp (optional safety)
    const u = Math.min(Math.max(xNorm, 0), 1);
    const v = Math.min(Math.max(zNorm, 0), 1);

    // Convert to pixel coordinates
    const px = Math.floor(u * (this.surfaceData.width - 1));
    const py = Math.floor(v * (this.surfaceData.height - 1));

    // Get pixel color (assuming this.surfaceData.data is Uint8ClampedArray of RGBA)
    const index = (py * this.surfaceData.width + px) * 4;
    const r = this.surfaceData.data[index];
    const g = this.surfaceData.data[index + 1];
    const b = this.surfaceData.data[index + 2];

    // Lookup surface type
    return G.getSurfaceFromColor(r, g, b);
  }
}



const surfaces = [
    "ob",
    "dirt",
    "rough",
    "fairway",
    "green",
    "green_edge",
    "bunker",
    "desert",
    "rock",
    "water",
  ];
