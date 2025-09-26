import * as G from '../utils/globals.js'; // use as G.varName
import * as THREE from 'three';
import { scene } from '../scenes/sceneSetup.js'; // use as G.varName
import { CAM_MANAGER } from '../managers/CamManager.js';


// === Physics constants ===
const GRAVITY = - 0.013; // testing rescale
const LIFT_COEF = 0.0001;
const GROUND_CONTACT_TIME = 2; // exponent
const SPIN_RATE_EXP = 2;  // exponent
const COMPRESS_CLUBSPIN = 7;
// global const GND_SPIN_CONST = is in globals

let slopeSpeed = .035// influence, different from friction
const stopThreshold = 0.02  ; // Adjust as needed
const GROUND_THRESHOLD = G.inTo(0.1); // threshold for contact with ground
const MIN_BOUNCE_VEL = .05     // when less than this will snap to ground

let startDropTime = 0;


export class Ball {
  constructor(holeManager, gameManager, showHelper=false) {
    this.HOLE_MANAGER = holeManager;
    this.GAME_MANAGER = gameManager;
    
    [this.mesh, this.helperMesh, 
      this.flightPath, this.flightPathPrev,
    ] = this.createMesh();

    // init params
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.groundSpinRate = 0;
    this.flightSpinRate = 0;
    this.spinVec = 0;
    this.drag = 1;

    // flight status
    this.isAirborn = false;
    this.firstBounce = false;
    this.firstStop = false;

    // tracking data
    this.initPos = false;
    this.carry = 0;
    this.maxHt = null;
    this.reachedApex = false;

    this.inHole = false;
    this.dropY = 0;

    // helpers
    this.showHelper = showHelper;
    this.flightPoints = [];
    this.maxFlightPoints = 200; // Limit number of trail points
  }

  createMesh() {
    const textureLoader = new THREE.TextureLoader();
    const ballTexture = textureLoader.load('./textures/wii_ball.jpg');

    const ballGeometry = new THREE.SphereGeometry(G.BALL_RADIUS, 12, 12);
    const ballMaterial = new THREE.MeshStandardMaterial({ 
      // color: 0xffffff,
      // roughness: 0.1, // Lower = shinier
      // metalness: 0.0, 
      map: ballTexture,
      roughness: 0.1,
      metalness: 0.0,
    });
    const ballMesh = new THREE.Mesh(ballGeometry, ballMaterial);
    ballMesh.castShadow = true;

    scene.add(ballMesh);
    console.log("Game Ball Created")

    // --- Transparent helper sphere ---
    const helperGeometry = new THREE.SphereGeometry(G.BALL_RADIUS * 18, 16, 16);
    const helperMaterial = new THREE.MeshBasicMaterial({
      color: 0xff8800,
      transparent: true,
      opacity: 0.2,
      depthWrite: false, // Prevent z-fighting with terrain
    });
    const helperMesh = new THREE.Mesh(helperGeometry, helperMaterial);
    console.log("created helperMesh: "+helperMesh)
    helperMesh.position.copy(ballMesh.position);
    scene.add(helperMesh);

    //ball flight
    const flightGeometry = new THREE.BufferGeometry().setFromPoints([]);
    const flightMaterial = new THREE.LineBasicMaterial({ color: 0xff54ee, transparent: true, opacity: 0.6 });
    const flightPath = new THREE.Line(flightGeometry, flightMaterial);
    scene.add(flightPath);
    //ball flight PREV
    const flightPrevGeometry = new THREE.BufferGeometry().setFromPoints([]);
    const flightPrevMaterial = new THREE.LineBasicMaterial({ color: 0x1f0c0c, transparent: true, opacity: 0.45 });
    const flightPathPrev = new THREE.Line(flightPrevGeometry, flightPrevMaterial);
    scene.add(flightPathPrev);

      
    return [ballMesh, helperMesh, flightPath, flightPathPrev];
  }

  get position() {
    return this.mesh.position;
  }

  teeUp(x, z) {
    // Input is course scale
    const y = G.getHeightAt(x,z, this.HOLE_MANAGER.gridXY, this.HOLE_MANAGER.gridWH, this.HOLE_MANAGER.heightData);
    
    this.position.set(x, y + G.BALL_RADIUS + G.inTo(2.5), z);
    this.velocity.set(0, 0, 0);

    this.isAirborn = false;
    this.firstBounce = false;
    this.firstStop = false;

    this.initPos = false;
    this.carry = 0;
    this.maxHt = -100000;
    this.reachedApex = false;

    this.inHole = false;
    this.dropY = 0;
    
    // helpers
    this.flightPoints = [];

    // aimTools.update();

  }

  update() {
    // if (!terrainMesh) return;
    if (!this.inHole) this.checkInHole();

    // GET BASIC INITIAL DATA
    const pos = this.position;    
    const vel = this.velocity;
    const speed = vel.length()
    const terrainHeight = G.getHeightAt(pos.x,pos.z, this.HOLE_MANAGER.gridXY, this.HOLE_MANAGER.gridWH, this.HOLE_MANAGER.heightData);
    console.log("uvel: "+vel.x.toFixed(2)+" | "+vel.y.toFixed(2)+" | "+vel.z.toFixed(2))

////////////////////////////////////////
// APPLY PHYSICS ///////////////////////
////////////////////////////////////////

    //// AIRBORN BALL (3D) ///////////////////////////////////////////////
    if (this.isAirborn) {
      console.log("in air")
      // this.mesh.material.color.set(0x00ff00); // todo: remove , for tracking

      // GRAVITY
      vel.y +=  GRAVITY ;


      //// IF INITIAL FLIGHT (BEFORE 1ST BOUNCE) ////
      if (!this.firstBounce) {

      // AIR DRAG
        const dragMagnitude = this.drag * (speed**2);
        const dragVec = vel.clone().normalize().multiplyScalar(-dragMagnitude);
        vel.add(dragVec)
        console.log("vel.add(dragVec): "+vel.x.toFixed(2)+" | "+vel.y.toFixed(2)+" | "+vel.z.toFixed(2))


      // LIFT (MAGNUS EFFECT)  -  perpendicular to both spin and velocity:
        const liftDir = new THREE.Vector3().crossVectors(this.spinVec, vel).normalize();
        
        const liftMag = (speed**2) * LIFT_COEF * this.flightSpinRate; 
        const liftVec = liftDir.multiplyScalar(liftMag);
        vel.add(liftVec)
        console.log("vel.add(liftVec): "+vel.x.toFixed(2)+" | "+vel.y.toFixed(2)+" | "+vel.z.toFixed(2))

      } //// END IF INITIAL FLIGHT


      // IF GROUND COLLISION //////////////
      if (pos.y - G.BALL_RADIUS <= terrainHeight + GROUND_THRESHOLD && vel.y < 0) {
        
        // GET CURRENT SURFACE PARAMS
        const surfaceType = this.HOLE_MANAGER.getSurfaceTypeAt(pos.x, pos.z);
        const surface = G.SURFACE_PROFILES[surfaceType] || G.SURFACE_PROFILES.ob;
        const { friction,bounceDecay, rollResistance, ballRaise } = surface;

        console.log(" ~~~~ BOUNCE ~~");
        
        // CALC LAND ANGLE
        const xzSpeed = Math.sqrt(vel.x ** 2 + vel.z ** 2);
        const landAngRad = Math.atan(Math.abs(vel.y) / xzSpeed);
        const landAngDeg = THREE.MathUtils.radToDeg(landAngRad);

        
        // LOG 1ST BOUNCE DATA
        if (!this.firstBounce) {

          this.firstBounce = true
          const initPos = this.initPos;
          const landingPos = new THREE.Vector3(pos.x,0,pos.z);
          const initPosXZ = new THREE.Vector3(initPos.x,0,initPos.z)
          const carryDist = Math.abs(landingPos.distanceTo(initPosXZ))
          this.carry = carryDist
          console.log(`phd__ CARRY    : ${(G.uToYd(carryDist)).toFixed(1)} yds.`)
          console.log(`phd__ LAND ANG : ${(landAngDeg).toFixed(1)}°`)

          const endTime = performance.now()
          const hangTime = endTime - startDropTime
          console.log(`phd__ HANG     : ${(hangTime/1000).toFixed(2)} s`)
        } // END LOG 1ST BOUNCE DATA


        // BOUNCE EFFECTS
        const xzBounceDecay = friction**GROUND_CONTACT_TIME
        const ySpinDecay = 1 - (this.groundSpinRate*this.swingSpin / 20)*.56

        vel.x *= xzBounceDecay ;
        vel.y *= (-bounceDecay * ySpinDecay);
        vel.z *= xzBounceDecay;
          // TODO: sloped bounce
        console.log("this.swingSpin "+this.swingSpin)
        console.log("this.groundSpinRate "+this.groundSpinRate)
        console.log("ySpinDecay "+ySpinDecay)
        console.log("bounceDecay "+bounceDecay)
        console.log("vel.BounceDec: "+vel.x.toFixed(2)+" | "+vel.y.toFixed(2)+" | "+vel.z.toFixed(2))

        // ADD SPIN ON BOUNCE
        const rotateVec90 = new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(-90));
        const groundSpinAngVec = this.spinVec.clone().applyMatrix4(rotateVec90)
        
          // different spin effects
        this.groundSpinRate *= friction**3;
        const landAngleComponent =  1 + (Math.min(landAngDeg,65) - 51)  / 100 
        const gndSpinDecay = .1 +  .33 * Math.min(1, vel.y/5); // only decays if speed under 3
        const spinRateExp = (this.swingSpin -.25)**(SPIN_RATE_EXP) + 0.25
        


          // combine spin effects
        const spinScale = ySpinDecay * spinRateExp *  friction * landAngleComponent *this.groundSpinRate * gndSpinDecay
        const groundSpinVec = groundSpinAngVec.multiplyScalar(spinScale)
          
          // add spin to veloctity
        // vel.add(groundSpinVec) // TODO: disabling until scaled correctly
        
        

        // RESET BALL TO GROUND HEIGHT
        pos.y = terrainHeight + G.BALL_RADIUS;

        // CHECK IF TRANSITION TO ROLLING
        if (Math.abs(vel.y) < MIN_BOUNCE_VEL ) {
          console.log("~~~~~~~~SNAP 2 GROUND ~~")
          vel.y = 0;
          this.isAirborn = false;
        } else {
          console.log('still bouncing: vel.y'+vel.y.toFixed(4))
        }
        
      } // END IF GROUND CONTACT //////////////


      // UPDATE POSITION WITH NEW VELOCITIES
      pos.add(vel);


      // CHECK FOR APEX
      const newMaxHt = pos.y
      if (newMaxHt < this.maxHt && !this.reachedApex) {
        // APEX PASSED
        const apex = this.maxHt - this.initPos.y
        console.log(`phd__ APEX     : ${G.uToYd(apex).toFixed(1)} yd.`)
        this.reachedApex = true

      } else {
        this.maxHt = newMaxHt
      }

    } //// END OF 3D BALL FLIGHT ///////////////// snaps to terrain ht /////////
    
    
    //// GROUND BALL (2D) ///////////////// snaps to terrain ht /////////
    else { 
      console.log("on ground")
      // GET CURRENT SURFACE PARAMS
      const surfaceType = this.HOLE_MANAGER.getSurfaceTypeAt(pos.x, pos.z);
      const surface = G.SURFACE_PROFILES[surfaceType] || G.SURFACE_PROFILES.ob;
      const { friction,bounceDecay, rollResistance, ballRaise } = surface;

      if (!this.inHole) {
        // --- SLOPE INFLUENCE ---
        const slope2D = this.GAME_MANAGER.getSlopeAt(pos.x, pos.z); // Vector2 (x,z)
        const slope3D = new THREE.Vector3(slope2D.x, 0, slope2D.y);
        const slopeForce = slope3D.multiplyScalar(slopeSpeed);
        vel.add(slopeForce);

        // --- FRICTION ---
        vel.multiplyScalar(friction);

        // --- ROLLING RESISTANCE ---
        const slowThresh = stopThreshold * 10;
        if (speed < slowThresh) {
          const delta = ((slowThresh - speed) / slowThresh) ** 2;
          vel.multiplyScalar(1 - rollResistance * delta);
        }

        if (speed < slowThresh) {
          const delta = ((slowThresh - speed) / slowThresh) ** 2;
          vel.multiplyScalar(1 - rollResistance * delta);

          // Turn red when slowing down
          // this.mesh.material.color.set(0xff0000);
        } else {
          // Return to normal color
          // this.mesh.material.color.set(0xffffff);
        }

        // --- STOPPING LOGIC ---
        if (speed < stopThreshold) {
          if (!this.firstStop){
            this.firstStop = true
              
            const initPos = this.initPos;
            const stopPos = new THREE.Vector3(pos.x,0,pos.z);
            const initPosXZ = new THREE.Vector3(initPos.x,0,initPos.z)
            const rollDist = Math.abs(stopPos.distanceTo(initPosXZ)) - this.carry
            console.log(`phd__ ROLL     : ${(G.uToYd(rollDist)).toFixed(1)} yd.`)
          }
          vel.set(0, 0, 0);
          
          // UPDATE MANAGERS
          console.log("stopped rolling...")
          this.GAME_MANAGER.ballInMotion = false;
          CAM_MANAGER.finishShot()

          // updateAimLine()
        }

        // --- UPDATE POSITION ---
        pos.add(vel);

        // --- STICK TO TERRAIN ---
        pos.y = terrainHeight + G.BALL_RADIUS + ballRaise;

      } else {
        // --- DROP INTO HOLE ---
        const dx = pos.x - this.GAME_MANAGER.pinPos.x;
        const dz = pos.z - this.GAME_MANAGER.pinPos.z;

        const dropX = dx * -dropSpeed;
        const dropZ = dz * -dropSpeed;
        this.dropY = Math.min(this.dropY + dropSpeed / 10, 1);

        vel.set(dropX, -this.dropY, dropZ);
        pos.add(vel);
      }
    }


// BALL HELPERS ///////////////////////
////////////////////////////////////////

    // UPDATE HELPER SPHERE
    if (this.showHelper && this.helperMesh != null) {
      this.helperMesh.position.copy(this.mesh.position);
    } 

    // UPDATE FLIGHT TRACKER
    if (vel.length() > stopThreshold*5) {
      this.flightPoints.push(this.position.clone());
      if (this.flightPoints.length > this.maxFlightPoints) {
        this.flightPoints.shift();
      }
      this.flightPath.geometry.dispose(); // Dispose old geometry
      this.flightPath.geometry = new THREE.BufferGeometry().setFromPoints(this.flightPoints);
    } 

  } 
  ///////////////////////////////////////////////////////////
  ///// END BALL.UPDATE /////////////////////////////////////
  ///////////////////////////////////////////////////////////


  strikeBall(aimAngleRad, vel, spinVec, spinRate, drag, swingSpin){
    console.log("phd__ init vel: ")
    console.log(vel)  
    // UPDATE MANAGERS
    this.GAME_MANAGER.ballInMotion = true;
    this.GAME_MANAGER.registerStroke();
    CAM_MANAGER.followShot(aimAngleRad)

    // geometry
    this.flightPathPrev.geometry.dispose(); // Dispose old geometry
    this.flightPathPrev.geometry = new THREE.BufferGeometry().setFromPoints(this.flightPoints);

    this.flightPoints = [this.position.clone()];
    this.flightPath.geometry.dispose(); // Dispose old geometry
    this.flightPath.geometry = new THREE.BufferGeometry().setFromPoints(this.flightPoints);

    // init params
    this.velocity.set(vel.x,vel.y,vel.z);
    this.flightSpinRate = spinRate;
    this.groundSpinRate = ( spinRate / 13 )*COMPRESS_CLUBSPIN + (13.3-COMPRESS_CLUBSPIN) ; // remap
    this.swingSpin = swingSpin || 0;
    console.log("setting swingSPing: "+swingSpin)
    this.spinVec = spinVec;
    this.drag = drag;

    // flight status
    this.isAirborn = true;
    this.firstBounce = false;
    this.firstStop = false;

    // tracking data
    this.initPos = this.position.clone();
    this.carry = 0;
    this.maxHt = -1000;
    this.reachedApex = false;

    this.inHole = false;
    this.dropY = 0;

    console.log("STRIKING")
    startDropTime = performance.now()
  }

  checkInHole() {
    if (!this.GAME_MANAGER.pinPos) return false;

    const dx = this.position.x - this.GAME_MANAGER.pinPos.x;
    const dz = this.position.z - this.GAME_MANAGER.pinPos.z;
    const dy = this.position.y - this.GAME_MANAGER.pinPos.y;

    const distXZ = Math.sqrt(dx * dx + dz * dz);
    const isWithinHole = distXZ < this.GAME_MANAGER.pinPos.radius;
    const isLowEnough = dy < G.BALL_RADIUS + .05; // Slightly above bottom
    const isSlowEnough = this.velocity.length() < 0.4; // tweak threshold


    if (isWithinHole && isLowEnough && isSlowEnough) {
      console.log("\n\n🏌️ Ball is in the hole!\n\n");
      this.inHole = true;

      const dropX = dx * -dropSpeed
      const dropZ = dz * -dropSpeed

      this.velocity.set(dropX,this.dropY,dropZ);
    } else {
      let inside = "O"
      let low = "O"
      let slow = "O"
      if (isWithinHole) {
        console.log("speed: "+this.velocity.length())
        
      }
      if (!isLowEnough) low = "x" 
      if (!isSlowEnough) slow = "x" 
      // console.log(inside+" "+low+" "+slow)
      // console.log(dy)
    }
  }


}


 