import * as THREE from 'three';
console.log("\n\n\n\n\n\n\n\n")
const BALL_RADIUS = 1.68 / 6


const TEST_GND_SPIN = .26 //: CONST
// let SWINF_SPINS = [0] //: CONST
const GROUND_CONTACT_TIME = 1 //TODO: CONST
const SPINRATEEXP = 2
const COMPRESS_CLUB_SPINS = 7

const surf = "green"

let SURFACE_PROFILES = { // todo:constify
  bounds:     {friction: 0.65 ,   bounceDecay: 0.08, rollResistance: 0.90,  ballRaise: -BALL_RADIUS*1.4 } ,
  dirt:       {friction: 0.85 ,   bounceDecay: 0.06, rollResistance: 0.40,  ballRaise: -BALL_RADIUS*.8 } ,
  rough:      {friction: 0.88 ,   bounceDecay: 0.12, rollResistance: 0.80,  ballRaise: -BALL_RADIUS*.6 } ,
  fairway:    {friction: 0.97 ,   bounceDecay: 0.20, rollResistance: 0.20,  ballRaise: BALL_RADIUS/15 } ,
  teebox:     {friction: 0.97 ,   bounceDecay: 0.20, rollResistance: 0.20,  ballRaise: BALL_RADIUS*3 } ,
  green:      {friction: 0.985,   bounceDecay: 0.22, rollResistance: 0.10,  ballRaise: BALL_RADIUS/10 } ,
  green_edge: {friction: 0.979 ,  bounceDecay: 0.21, rollResistance: 0.15,  ballRaise: BALL_RADIUS/10 } ,
  bunker:     {friction: 0.7 ,   bounceDecay: 0.04, rollResistance: 0.90,  ballRaise: -BALL_RADIUS*1.1 } ,
  water:      {friction: 0.01 ,   bounceDecay: 0.01, rollResistance: 0.90,  ballRaise: -BALL_RADIUS*3 } ,
  water_edge: {friction: 0.99 ,   bounceDecay: 0.50, rollResistance: 0.10,  ballRaise: BALL_RADIUS/10 } ,
};

const friction = SURFACE_PROFILES[surf].friction 
const bounceDecay = SURFACE_PROFILES[surf].bounceDecay 
const rollResistance = SURFACE_PROFILES[surf].rollResistance 

// const friction = 0.97
// const bounceDecay = 0.2
// const rollResistance = 0.2


const MAXRANGE = 10
const GAPRANGE = 2

let DRAG_COEF = .002
const LIFT_COEF = .0001
const POW_SCALE = 1.4
const SPIN_SCALEUP = 1
const DRAG_SCALE = 1

const CLUB_PROFILES = {
  "driver" : {name:"Driver",  launchAngle: 12 , maxPower: 10, minSwingSpin: 0, maxSwingSpin: 1, spinRate: 1.0,   drag: 0.00107},
  "wood" :   {name:"3 Wood",  launchAngle: 11.2 , maxPower: 8.55, minSwingSpin: 0, maxSwingSpin: 0.9, spinRate: 2.25,   drag: 0.00121},
  "3i" :     {name:"3 Iron",  launchAngle: 12.3 , maxPower: 8.3, minSwingSpin: 0, maxSwingSpin: 0.9, spinRate: 2.44,   drag: 0.00145},
  "5i" :     {name:"5 Iron",  launchAngle: 13.3 , maxPower: 6.53,  minSwingSpin: 0,  maxSwingSpin: 0.9, spinRate:  4.2,  drag: 0.00145},
  "7i" :     {name:"7 Iron",  launchAngle: 16.1 , maxPower: 5.3,  minSwingSpin: 0.2,  maxSwingSpin: .9, spinRate:  5.22,  drag: 0.00145},
  "9i" :     {name:"9 Iron",  launchAngle: 20.4 , maxPower: 4.1 , minSwingSpin: 0.34, maxSwingSpin: 1, spinRate:  7.2,  drag: 0.00145},
  "gap" :    {name:"56°",     launchAngle: 26.8 , maxPower: 3.5, minSwingSpin: 0.51, maxSwingSpin: 1, spinRate: 8.35,  drag: 0.00160},
  "lob" :   {name:"Lob Wedge", launchAngle: 30.5 ,maxPower: 3.5 , minSwingSpin: 0.32, maxSwingSpin: .95, spinRate:  13,  drag: .00238},
//   "putter" : {name:"Putter", launchAngle:  0.0 ,  maxPower: 3.0 , minSwingSpin: 0.2, maxSwingSpin: 1, spinRate:  0.0,   drag: 0.0},
}


let RESULTS = {
//   "driver" : {carry:0, apex:0, landAng:0},
//   "wood" : {carry:0, apex:0, landAng:0},
//   "3i" : {carry:0, apex:0, landAng:0},
//   "5i" : {carry:0, apex:0, landAng:0},
//   "7i" : {carry:0, apex:0, landAng:0},
//   "9i" : {carry:0, apex:0, landAng:0},
//   "gap" : {carry:0, apex:0, landAng:0},
//   "lob" : {carry:0, apex:0, landAng:0},
}


// OPTIONS ///////////////////////////////
const GRAVITY = -.013
const SWING_POWER = 1;



const AIM_ANGLE = 0 //: CONST

const stopThreshold = 0.02; // Adjust as needed
const GROUND_THRESHOLD = 0.01; // threshold for contact with ground
const MIN_BOUNCE_VEL = .05 // when less than this will snap to ground







class Ball {
  constructor(x,z,clubName) {
    this.position = new THREE.Vector3(x, BALL_RADIUS + .02 ,z)
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.flightSpinRate = 0;
    this.groundSpinRate = 0;
    this.swingSpin = 0;
    this.spinVec = 0;
    this.reachedApex = false;
    this.isAirborn = false;
    this.firstBounce = false;
    this.carry = 0;
    this.firstStop = false;
    this.initPos = null;
    this.maxHt = null;
    this.done = false;
    this.club = clubName;
  }


  update() {
    // GET BASIC INITIAL DATA
    const pos = this.position;    
    const vel = this.velocity;
    const speed = vel.length()
    // console.log(pos)

////////////////////////////////////////
// APPLY PHYSICS ///////////////////////
////////////////////////////////////////

    //// AIRBORN BALL (3D) ///////////////////////////////////////////////
    if (this.isAirborn) {

      // GRAVITY
      vel.y +=  GRAVITY ;


      //// IF INITIAL FLIGHT (BEFORE 1ST BOUNCE) ////
      if (!this.firstBounce) {

      // AIR DRAG
        const dragMagnitude = DRAG_COEF * (speed**2);
        const dragVec = vel.clone().normalize().multiplyScalar(-dragMagnitude);
        vel.add(dragVec)


      // LIFT (MAGNUS EFFECT)  -  perpendicular to both spin and velocity:
          const liftDir = new THREE.Vector3().crossVectors(this.spinVec, vel).normalize();

          const liftMag = (vel.length())**2 * LIFT_COEF * this.flightSpinRate; 
          const liftVec = liftDir.multiplyScalar(liftMag);
          vel.add(liftVec)

      } //// END IF INITIAL FLIGHT


      // IF GROUND COLLISION //////////////
      const terrainHeight = 0;
      if (pos.y - BALL_RADIUS <= terrainHeight + GROUND_THRESHOLD && vel.y < 0) {
    //   console.log("bounce")

        
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
        //   console.log(`CARRY: ${(carryDist/6).toFixed(1)} yd.`)
        //   console.log(`LAND ANG: ${(landAngDeg).toFixed(1)}°`)
        //   RESULTS[this.club]["carry"] = (carryDist/6).toFixed(1)
        //   RESULTS[this.club]["landAng"] = (landAngDeg).toFixed(1)

        } // END LOG 1ST BOUNCE DATA



        // BOUNCE EFFECTS
        const xzBounceDecay = friction**GROUND_CONTACT_TIME
        const ySpinDecay = 1 - (this.groundSpinRate*this.swingSpin / 20)*.56
        // console.log("this.swingSpin: "+(this.swingSpin))
        // console.log("FWB DEC: "+(-bounceDecay))
        // console.log("Y SPIN DEC: "+(ySpinDecay))
        // console.log("Y DEC: "+(-bounceDecay * ySpinDecay))
        vel.x *= xzBounceDecay ;
        vel.y *=(-bounceDecay * ySpinDecay);
        vel.z *= xzBounceDecay;
            // TODO: sloped bounce

        // ADD SPIN ON BOUNCE
        const rotateVec90 = new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(-90));
        const groundSpinAngVec = this.spinVec.clone().applyMatrix4(rotateVec90)
        
        const gndSpinDecay = .1 +  .33 * Math.min(1, vel.y/5); // only decays if speed under 3
        const landAngleComponent =  1 + (Math.min(landAngDeg,65) - 51)  / 100 
        this.groundSpinRate *= friction**3;


        const spinRateExp = (this.swingSpin -.25)**(SPINRATEEXP) + 0.25
        const spinScale = ySpinDecay * spinRateExp *  friction * landAngleComponent *this.groundSpinRate * gndSpinDecay
        // console.log("\t* "+this.groundSpinRate.toFixed(2)+" * "+ landAngDeg.toFixed(2)+" * "+ vel.y.toFixed(2)+" * "+friction)
        // console.log("\t= "+spinScale)

        const groundSpinVec = groundSpinAngVec.multiplyScalar(spinScale)

        vel.add(groundSpinVec)
        // console.log(groundSpinVec)
        pos.y = terrainHeight + BALL_RADIUS;


        // console.log(vel.y.toFixed(4)+" BncDec ("+bounceDecay+") => "+vel.y.toFixed(4) * -bounceDecay)
        // vel.y *= -bounceDecay;

        if (Math.abs(vel.y) < MIN_BOUNCE_VEL ) {
            
          // Transition to rolling
          vel.y = 0;
          this.isAirborn = false;
        }
      } // END IF GROUND CONTACT //////////////


      // UPDATE POSITION WITH NEW VELOCITIES
      pos.add(vel);

      // CHECK FOR APEX
      const newMaxHt = pos.y
      if (newMaxHt < this.maxHt && !this.reachedApex) {
        // APEX PASSED
        const apex = this.maxHt - this.initPos.y
        // console.log(`APEX: ${(apex/6).toFixed(1)} yd.`)
        // RESULTS[this.club]["apex"] = (apex/6).toFixed(1)
        this.reachedApex = true
      } else {
        this.maxHt = newMaxHt
      }

    } 
    
    //// GROUND BALL (2D) ///////////////// snaps to terrain ht /////////
    else { 
    //   console.log("rolling")
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

        } 
        // --- STOPPING LOGIC ---
        if (speed < stopThreshold) {
            if (!this.firstStop){
            this.firstStop = true
                
            const initPos = this.initPos;
            const stopPos = new THREE.Vector3(pos.x,0,pos.z);
            const initPosXZ = new THREE.Vector3(initPos.x,0,initPos.z)
            const rollDist = Math.abs(stopPos.distanceTo(initPosXZ)) - this.carry
            console.log(`\tROLL: ${(rollDist/6).toFixed(1)} yd.`)
            }
            vel.set(0, 0, 0);
            this.done = true
        }

        // --- UPDATE POSITION ---
        pos.add(vel);

        // --- STICK TO TERRAIN ---
        pos.y = 0 + BALL_RADIUS;

      
    }


  } 
  ///////////////////////////////////////////////////////////
  ///// END BALL.UPDATE /////////////////////////////////////
  ///////////////////////////////////////////////////////////

  strikeBall(vel, spinVec, spinRate,swingSpin){
    // console.log("STRIKING "+swingSpin)
    this.velocity.set(vel.x,vel.y,vel.z);
    this.spinVec = spinVec;
    this.flightSpinRate = spinRate;
    this.groundSpinRate = ( spinRate / 13 )*COMPRESS_CLUB_SPINS + (13.3-COMPRESS_CLUB_SPINS) ; //changed
    this.swingSpin = swingSpin;
    this.isAirborn = true;
    this.firstBounce = false;
    this.firstStop = false;
    this.done = false;
    this.initPos = this.position.clone();
    this.maxHt = -100000;

  }


  resetPos(x,z) {
    this.reachedApex = false

    this.position.set(x, BALL_RADIUS + .02, z);
    this.velocity.set(0, 0, 0);

    this.done = false
    this.isAirborn = false
    this.firstBounce = false;
    this.firstStop = false;
    this.initPos = null;
    this.maxHt = null;
  }
}


function setupSwing(club,ball,swingSpin) {
  DRAG_COEF = CLUB_PROFILES[club]["drag"] * DRAG_SCALE;
  const clubSpinRate = CLUB_PROFILES[club]["spinRate"];


  const htAngle = CLUB_PROFILES[club]["launchAngle"];
  const clubPower = CLUB_PROFILES[club]["maxPower"];
  const power = SWING_POWER * clubPower * POW_SCALE

  const angleAimRad = AIM_ANGLE * (Math.PI / 180);
  const angleHtRad = htAngle * (Math.PI / 180);

  // Horizontal projection
  const horizontalPower = Math.cos(angleHtRad) * power;
  const vx = Math.sin(angleAimRad) * horizontalPower;
  const vz = Math.cos(angleAimRad) * horizontalPower;

  // Vertical component
  const vy = Math.sin(angleHtRad) * power;

  const shotVel = new THREE.Vector3(vx, vy, vz);
  const shotAngleVec = new THREE.Vector3(vx, 0, vz);
  
  const rotateVec90 = new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(-90));
  const spinVec = shotAngleVec.clone().applyMatrix4(rotateVec90).normalize()

  const minSS = CLUB_PROFILES[club]["minSwingSpin"]
  const maxSS = CLUB_PROFILES[club]["maxSwingSpin"]
  const swingSpinClamped = swingSpin*(maxSS-minSS) + minSS +  TEST_GND_SPIN
  
  ball.strikeBall(shotVel, spinVec, clubSpinRate,swingSpinClamped);
};

function printResults() {
    let txt = ""
    for (const [club, data] of Object.entries(RESULTS)) {
        let line = ""
        line += club+","
        line += data["apex"]+","
        line += data["carry"]+","
        line += data["landAng"]+"\n"
        txt += line
    }
    console.log()
    console.log(txt)
}


function testClubs() {
    for (const [club, clubProfile] of Object.entries(CLUB_PROFILES)) {
        console.log("\nTesting Club: "+clubProfile["name"])
        for (let i=9; i < 10.0001; i+=.1){
            const swingSpinPower = i/10
            const ball = new Ball(0,0,club)
            setupSwing(club,ball,swingSpinPower)
            // console.log("Sp:"+swingSpinPower)
            while (!ball.done) {
                ball.update()
            }
        }
    }
    console.log("\n\n")
    printResults()
}

testClubs()




