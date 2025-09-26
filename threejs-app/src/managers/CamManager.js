import * as G from '../utils/globals.js'; // use as G.varName
import * as THREE from 'three';
import { HOLE_MANAGER } from './GameManager.js';

const cameraHeight = G.ftTo(6) //13 default 
const cameraDistance = G.ftTo(18);
let debugCamHt = cameraHeight;
let debugCamDist = cameraDistance;
let debugLookHt = calcLookHt;
let debugDirection = 0;

const TRACKING_DELAY = 80 // # frames it stays on tee cam before tracking
const RESTING_TIME = 100 // # frames it stays on resting position after shot is done


export class CamManager {
  constructor() {
    console.log("Hi from Cam construct")
    this.cam = null;
    this.active = false;
    this.tracking = false;
    this.trackingAngle = false;
    this.trkDelayTime = 0;
    this.resting = false;
    this.restTime = 0;
    this.ball = null
  }
  updateCamDist(val) { 
    let delta = G.ftTo(val - debugCamDist)
    this.cam.position.add(debugDirection.clone().multiplyScalar(delta))
    debugCamDist = val

  }
  updateCamHt(val) {
    let delta = G.ftTo(val - debugCamHt)
    this.cam.position.add(new THREE.Vector3(0, delta, 0));
    debugCamHt = val
  }
  updateLookHt(val) {
    let delta = G.ftTo(val) - debugLookHt
    this.cam.lookAt.add(new THREE.Vector3(0, delta, 0));
    debugLookHt = val
  }

  setTeeCam(direction) {
    console.log("setting tee cam")
    if (this.cam.name != "game") {
      return
    }
    // assumes ball is on tee
    debugDirection = direction.clone()
    // Desired camera distance behind the ball
    const cameraPos = new THREE.Vector3().copy(this.ball.position).add(direction.clone().multiplyScalar(cameraDistance));
    this.cam.position.set(
      cameraPos.x, 
      this.ball.position.y + cameraHeight , 
      cameraPos.z
    );
    console.log("\tcamPos: ")
    console.log(this.cam.position)

    const lookAtHeight = calcLookHt()
    this.cam.lookAt(new THREE.Vector3(HOLE_MANAGER.pinPos.x, HOLE_MANAGER.pinPos.y + lookAtHeight , HOLE_MANAGER.pinPos.z));
  
    console.log("\tCamLook: ")
    console.log(new THREE.Vector3(HOLE_MANAGER.pinPos.x, HOLE_MANAGER.pinPos.y + lookAtHeight , HOLE_MANAGER.pinPos.z))
  
  }

  aimCam(aimAngle) {
    if (this.cam.name != "game") {
      return
    }
    const pinVec = HOLE_MANAGER.getPinPos
    // Step 1: Get direction from ball to hole
    const baseDirection = new THREE.Vector3().subVectors(pinVec, this.ball.position).normalize();

    // Step 2: Apply aim rotation (player turning left/right)
    const aimDirection = baseDirection.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), aimAngle);

    const cameraPosition = this.ball.position.clone()
    cameraPosition.x += -cameraDistance * aimDirection.x;
    cameraPosition.z += -cameraDistance * aimDirection.z;

    cameraPosition.y += cameraHeight;
    this.cam.position.copy(cameraPosition);

    const distanceToHole = this.ball.position.distanceTo(pinVec);
    const lookTarget = this.ball.position.clone().add(aimDirection.clone().multiplyScalar(distanceToHole))
      .add(new THREE.Vector3(0, calcLookHt(), 0)); // add height

    this.cam.lookAt(lookTarget);
  }

  sidetrackShot(aimAngleRad) {
    this.active = true;
    this.tracking = "sidetrack";
    this.trackingAngle = aimAngleRad;
  }
  followShot(aimAngleRad) {
    this.active = true;
    this.tracking = "follow";
    this.trackingAngle = aimAngleRad;
  }
  finishShot() {
    console.log("CAM finishing shot")
    this.tracking = false;
    this.resting = true;
    this.restTime = 0;
    this.trkDelayTime = 0;
  }
  update () {
    if (this.tracking){
      if (this.tracking == "sidetrack") {
        if (this.ball.reachedApex || this.ball.velocity.y <= 0) {
          // set tracking position
          // console.log("CAM = side tracking");
          const lookX = this.ball.position.x
          const lookY = this.ball.position.y
          const lookZ = this.ball.position.z

          this.cam.lookAt(
            lookX, 
            lookY, 
            lookZ
          );

          const lookDist = Math.min( G.ftTo(130) , HOLE_MANAGER.holeDistance );
          const camX = lookX + Math.cos(this.trackingAngle)*lookDist
          const camZ = lookZ + Math.sin(this.trackingAngle)*lookDist
          this.cam.position.set(
            camX, 
            // cameraHeight+G.uToFt(5) + G.getHeightAt(camX,camZ, HOLE_MANAGER.gridXY, HOLE_MANAGER.gridWH, HOLE_MANAGER.heightData),
            cameraHeight*2 + lookY,
            camZ
          );
        } else {
          // stay on tee but zoom out and up
          // this.trkDelayTime ++;
          // console.log("CAM = tee zoom")
          
          // zoom in
          const zoomSpeed = G.inTo(3); 
          const camX = this.cam.position.x + Math.sin(this.trackingAngle)*zoomSpeed
          const camZ = this.cam.position.z + Math.cos(this.trackingAngle)*zoomSpeed
          
          // ramp y zoom
          let camY = this.cam.position.y
          const minY = G.inTo(10) + G.getHeightAt(camX,camZ, HOLE_MANAGER.gridXY, HOLE_MANAGER.gridWH, HOLE_MANAGER.heightData);
          if (camY > minY + G.inTo(5)) {
            camY = (camY - minY) * G.inTo(5) + minY;
          }
          this.cam.position.set(
            camX, 
            camY, 
            camZ
          );


          
          const lookX = this.ball.position.x
          const lookY = this.ball.position.y
          const lookZ = this.ball.position.z

          this.cam.lookAt(
            lookX, 
            lookY, 
            lookZ
          );

        }
      }
      else if (this.tracking == "follow") {
        const lookX = this.ball.position.x
        const lookY = this.ball.position.y
        const lookZ = this.ball.position.z
        this.cam.lookAt(
          lookX, 
          lookY, 
          lookZ
        );

        const lookDist = G.ftTo(130)
        const camX = lookX - Math.sin(this.trackingAngle)*lookDist
        const camZ = lookZ - Math.cos(this.trackingAngle)*lookDist
        this.cam.position.set(
          camX, 
          cameraHeight*2 + lookY,
          camZ
        );
      }

    }
    else if (this.resting) {
      console.log("CAM = resting");
      if (this.restTime < RESTING_TIME) {
        this.restTime ++;
        const minFOV = 15;
        if (this.cam.fov > 15.2) {
          const zoom = (this.cam.fov - minFOV) * .977 + minFOV;
          this.setFOV(zoom);
        }
      } else {
        // end rest shot and stop udpating this.cam
        this.resting = false;
        console.log("shot done!")

        this.setFOV(G.DEFAULT_CAM_FOV); // reset
        this.active = false;
        HOLE_MANAGER.setupShot()
      }
    }
  }

  setFOV(newFOV){
    this.cam.fov = newFOV;
    this.cam.updateProjectionMatrix() 
  }
}

export const CAM_MANAGER = new CamManager();


function calcLookHt() {
  const dist = HOLE_MANAGER.holeDistance
  const distNorm = dist / 600 // max yds
  const ht = distNorm * 200 + 0 // * maxAngle + minAngle
  return G.ftTo(-ht) // negative to look down
}
