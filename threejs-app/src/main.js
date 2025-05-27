import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { TextureLoader, PlaneGeometry, MeshPhongMaterial, Mesh } from 'three';
import './style.css';
import { Sky } from 'three/examples/jsm/objects/Sky.js';


// TODO /////////////////////////////////

// BALL STRIKING:
  // did we do spin rate, shouldnt it decay
  // lessen bounce, Overdid it, now increase
  // club selection menu?
  // lie pre-shot effect
  // bounce off of slope
  // why does it not die in water

// TODO /////////////////////////////////


// 1yds = 3units/px
// 1 ft = 1 unit
console.log("1. Initializing")
const HOLE_NAME = "aug12"
let GAME_MANAGER;
let HOLE_MANAGER;
let CAM_MANAGER;
let UI_MANAGER;

// OPTIONS ///////////////////////////////
let ball = false;
let aimTools = false;
let curFrame = 0
const GRAVITY = -.013

const LIFT_COEF = .0001 // lift constant TODO: CONST
const GROUND_CONTACT_TIME = 1   //TODO: CONST , # of times friction is applied at contact frame to simulate longer contact time
const GND_SPIN_CONST = 0.26   // just adds to the 0-1 base swingSpin
const SPIN_RATE_EXP = 2         // increases effects at higher spin
const COMPRESS_CLUBSPIN = 7 // increases spin for lower spin clubs on ground (remaps 0 - 13 to 7 - 13.5)

let SWING_POWER = 1;
let SWING_SPIN = 0;
let AIM_ANGLE = 0;

let OPT_ORBIT = false;
let FAST_TXT = false;

const OPT_VIEW = "teeSide" // top/tee
const OPT_RES = 2048
const FILE_BUMP = `bump_${HOLE_NAME}_${OPT_RES}.raw`
const OPT_SIZE = 2048
const OPT_SIGHT_DIST = OPT_SIZE*1.2
const OPT_BUMPHEIGHT = 100

const CUP_RADIUS = 4.25/6
const CUP_DIG = 1
const FLAGSTICK_HT = 20
const BALL_RADIUS = 1.68 / 6

const HOLE_LOC = {x:15.5,z:23}; // test
// const HOLE_LOC = {x:52,z:71}; // aug12

const view_ht = 65
const look_ht = 57.5
const views = {
  "isoTee": [25,0 , 45,15],
  "tee1": [45,0 , 45,80],
  "teeSide": [0,20 , 99,20],
  "tee2": [54,0 , 54,80],
  "tee3": [63.2,0 , 63.2,80],
  "tee4": [72.5,0 , 72.5,80],
  "tee5": [82,0 , 82,80],
  
  "puttFr": [15.5,12, 15.5,26],
  "puttBk": [15.5,28, 15.5,19],
  "puttL": [11,22, 21,22],
  "puttR": [20,22, 10,22],
}


  
const rotateSpeed = 0.03;
const baseSpeed = 1;
const sprintMultiplier = 10;
const eyeLevel = 5.7 * 2;
const keyState = {};

window.addEventListener('keydown', (e) => {
  keyState[e.key.toLowerCase()] = true;
});
window.addEventListener('keyup', (e) => {
  keyState[e.key.toLowerCase()] = false;
});


window.setCameraView = function(viewName) {
  const view = views[viewName];
  if (!view) return;

  let camX = ( view[0]/100 - .5) * OPT_SIZE
  let camZ = ( -view[1]/100 + .5) * OPT_SIZE
  lookX = ( view[2]/100 - .5) * OPT_SIZE
  lookZ = ( -view[3]/100 + .5) * OPT_SIZE -1
  

  let camY = getHeightAt(camX,camZ) +24
  let lookY = getHeightAt(lookX,lookZ)

  camera.position.set(camX, camY, camZ);
  camera.lookAt(lookX, lookY, lookZ);
  
  controls.target.set(lookX, lookY, lookZ);
  controls.update();
  updateTextBoxes(view);
}

// window.setCameraView = function(viewName) {
//   const view = views[viewName];
//   if (!view) return;

//   let camX = ( view[0]/100 - .5) * OPT_SIZE
//   let camZ = ( -view[1]/100 + .5) * OPT_SIZE
//   lookX = ( view[2]/100 - .5) * OPT_SIZE
//   lookZ = ( -view[3]/100 + .5) * OPT_SIZE -1
  

//   camera.position.set(camX, view_ht, camZ);
//   camera.lookAt(lookX, look_ht, lookZ);
  
//   controls.target.set(lookX, look_ht, lookZ);
//   controls.update();
//   updateTextBoxes(view);
// }
  
  
function updateTextBoxes(values) { 
  // Update text input boxes
  document.getElementById('camX').value = values[0].toFixed(0);
  document.getElementById('camZ').value = values[1].toFixed(0);
  document.getElementById('lookX').value = values[2].toFixed(0);
  document.getElementById('lookZ').value = values[3].toFixed(0);
  document.getElementById('shiftX').value = "";
  document.getElementById('shiftZ').value = "";
  document.getElementById('shiftY').value = "";
}


////////////////////////////////////////////////////////////////////////////////
// CAMERA , RENDER, LIGHT SETUP ////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
const scene = new THREE.Scene();

let CAM_FOV = 50
let CAMERA = new THREE.PerspectiveCamera(
  CAM_FOV, 16/9, 0.1, OPT_SIGHT_DIST
  // fov, aspect, near, far
  // CAM_FOV, window.innerWidth / window.innerHeight, 0.1, OPT_SIGHT_DIST
);
// RENDERER
const renderer = new THREE.WebGLRenderer({ antialias: true });
if (window.innerWidth > window.innerHeight){
  renderer.setSize(window.innerHeight * 16/9, window.innerHeight);
} else {
  renderer.setSize(window.innerWidth, window.innerWidth * 9/16);
}
// renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.setClearColor(0x87ceeb); // sky blue color

const sky = new Sky();
sky.scale.setScalar(4500);  // Big enough to surround your scene
scene.add(sky);

const skyUniforms = sky.material.uniforms;

skyUniforms['turbidity'].value = 2;         // Haze in atmosphere, 1-20 (higher = hazier)
skyUniforms['rayleigh'].value = .5;           // Rayleigh scattering amount (blue sky effect)
skyUniforms['mieCoefficient'].value = 0.005; // Mie scattering (sun glow / haze)
skyUniforms['mieDirectionalG'].value = 0.1;  // Directional bias for mie scattering
const sun = new THREE.Vector3();

function updateSun() {
  // Angles in radians
  const inclination = 0.4; // 0 is zenith, 0.5 is horizon
  const azimuth = 1.28;     // around the horizon

  const theta = Math.PI * inclination;
  const phi = 2 * Math.PI * azimuth;

  sun.x = Math.cos(phi) * Math.sin(theta);
  sun.y = Math.cos(theta);
  sun.z = Math.sin(phi) * Math.sin(theta);

  skyUniforms['sunPosition'].value.copy(sun);
}

updateSun();


let controls;
if (OPT_ORBIT){
  controls = new OrbitControls(CAMERA, renderer.domElement);
  // controls.target.set(lookX, look_ht, lookZ);
  controls.enablePan = true;
  controls.enableRotate = true;
  controls.minDistance = 10;
  controls.maxDistance = OPT_SIGHT_DIST;
}

// LIGHTING
const light = new THREE.DirectionalLight(0xffffff, 3);
light.position.set(0, 50, 50).normalize();
scene.add(light);




/////////////////////////////////////////////////////////////////////////////////////////
////////  ADD TERRAIN  + TEXTURES  //////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////


function getHeightAt(x, z) {
  const size = OPT_SIZE;
  const res = OPT_RES;

  // Convert world coordinates to heightmap indices
  const fx = (x + size / 2) / size * (res - 1);
  const fz = (z + size / 2) / size * (res - 1);

  // Clamp to valid range
  const x0 = Math.floor(fx);
  const x1 = Math.min(x0 + 1, res - 1);
  const z0 = Math.floor(fz);
  const z1 = Math.min(z0 + 1, res - 1);

  const tx = fx - x0;
  const tz = fz - z0;

  // Convert 2D index to 1D index
  const i00 = z0 * res + x0;
  const i10 = z0 * res + x1;
  const i01 = z1 * res + x0;
  const i11 = z1 * res + x1;

  const h00 = heightData[i00] / 65535;
  const h10 = heightData[i10] / 65535;
  const h01 = heightData[i01] / 65535;
  const h11 = heightData[i11] / 65535;

  // Bilinear interpolation
  const h0 = h00 * (1 - tx) + h10 * tx;
  const h1 = h01 * (1 - tx) + h11 * tx;
  const h = h0 * (1 - tz) + h1 * tz;

  return h * OPT_BUMPHEIGHT;
}
function getSlopeAt(x, z, spacing = 1) {
  const hL = getHeightAt(x - spacing, z); // left
  const hR = getHeightAt(x + spacing, z); // right
  const hD = getHeightAt(x, z - spacing); // down
  const hU = getHeightAt(x, z + spacing); // up

  // partial derivatives (slopes)
  const dx = (hR - hL) / (2 * spacing);
  const dz = (hU - hD) / (2 * spacing);

  return new THREE.Vector2(-dx, -dz); // negative = "downhill"
}


console.log("Drawing Surface Map for sampling")
const surfaceMapCanvas = document.createElement('canvas');
const surfaceMapCtx = surfaceMapCanvas.getContext('2d');

const surfaceMapImg = new Image();
let surfaceMapImgData;
surfaceMapImg.onload = () => {
  surfaceMapCanvas.width = surfaceMapImg.width;
  surfaceMapCanvas.height = surfaceMapImg.height;
  surfaceMapCtx.drawImage(surfaceMapImg, 0, 0);
  surfaceMapImgData = surfaceMapCtx.getImageData(0, 0, surfaceMapImg.width, surfaceMapImg.height).data;
  // Store surfaceMapImgData for sampling later
};
surfaceMapImg.src = `surface_maps/surface_map_${HOLE_NAME}.png`;

function getSurfaceTypeAt(x, z) {
  const uvX = (x + OPT_SIZE / 2) / OPT_SIZE;
  const uvY = (z + OPT_SIZE / 2) / OPT_SIZE;

  const px = Math.floor(uvX * surfaceMapCanvas.width);
  const py = Math.floor(uvY * surfaceMapCanvas.height);

  const i = (py * surfaceMapCanvas.width + px) * 4;
  const r = surfaceMapImgData[i];
  const g = surfaceMapImgData[i + 1];
  const b = surfaceMapImgData[i + 2];

  return getSurfaceFromColor(r, g, b);
}
function getSurfaceFromColor(r, g, b) {
  const color = `${r},${g},${b}`;
  const surfaceLookup = {
      '0,0,0': 'bounds',
      '100,0,0': 'dirt',
      '0,100,0': 'rough',
      '0,200,0': 'fairway',
      '0,255,0': 'teebox',
      '255,255,150': 'green',
      '220,255,0': 'green_edge',
      '255,255,255': 'bunker',
      '0,200,255': 'water',
      '0,0,255': 'water_edge'
  };

  const surface = surfaceLookup[color]
  if ( surface ) {
    return surface;
  } else {
    console.log("illegal surfMap color: "+color)
    return 'terrain'
  }
}




async function makeTerrainMesh(holeName) {
  // TODO:  IMPLEMENT DYNAMIC FILES BASED ON HOLE NAME
  console.log("2. Building Terrain Mesh for "+holeName);

  const terrainWidth = OPT_SIZE;
  const terrainHeight = OPT_SIZE;
  const terrainSegments = OPT_RES - 1;
  const vertexCount = OPT_RES * OPT_RES;

  // 1. Load 16-bit heightmap
  console.log("\t2b. Loading Bumpmap...");

  const res = await fetch('/bump_maps/'+FILE_BUMP);
  const buffer = await res.arrayBuffer();
  heightData = new Uint16Array(buffer);
  console.log("\t\t-- Done Loading Bump!");

  if (heightData.length !== vertexCount) {
    console.error(`Heightmap size mismatch: got ${heightData.length}, expected ${vertexCount}`);
    return;
  }

  // 2. Create geometry
  const geometry = new THREE.PlaneGeometry(terrainWidth, terrainHeight, terrainSegments, terrainSegments);
  geometry.rotateX(-Math.PI / 2);

  applyHeightmap(heightData, OPT_RES, OPT_RES); // width and height of the RAW file

  function applyHeightmap(data, width, height) {
    const vertices = geometry.attributes.position;
    const size = OPT_SIZE;

    for (let i = 0; i < vertices.count; i++) {
      const vx = vertices.getX(i);
      const vz = vertices.getZ(i);

      // Convert world coordinates to heightmap coords
      const fx = (vx + size / 2) / size * (width - 1);
      const fz = (vz + size / 2) / size * (height - 1);

      const x0 = Math.floor(fx);
      const x1 = Math.min(x0 + 1, width - 1);
      const z0 = Math.floor(fz);
      const z1 = Math.min(z0 + 1, height - 1);

      const tx = fx - x0;
      const tz = fz - z0;

      const get = (x, z) => data[z * width + x] / 65535;

      const h00 = get(x0, z0);
      const h10 = get(x1, z0);
      const h01 = get(x0, z1);
      const h11 = get(x1, z1);

      const h0 = h00 * (1 - tx) + h10 * tx;
      const h1 = h01 * (1 - tx) + h11 * tx;
      const h = h0 * (1 - tz) + h1 * tz;

      vertices.setY(i, h * OPT_BUMPHEIGHT);
    }

    vertices.needsUpdate = true;
    geometry.computeVertexNormals();
  }



  console.log("\t2c. Creating Surface Material...");
  let terrainMaterial;
  if (FAST_TXT) {
    terrainMaterial = new THREE.MeshStandardMaterial({ color: 0x1c5c35 });
  } else {
    terrainMaterial = await createSurfaceTexturesAsync()
  }

  terrainMesh = new THREE.Mesh(geometry, terrainMaterial);
  scene.add(terrainMesh);

  console.log("4. Terrain Added to Scene");

  // addSurfaceTextures()

  console.log("\n\nDONE WITH TERRAIN MESH\n\n");
}

const surfaces = [
  "bounds",
  "dirt",
  "rough",
  "fairway",
  "teebox",
  "green",
  "green_edge",
  "bunker",
  "water",
  "water_edge"
];
const surfaceTextures = Object.fromEntries(
  surfaces.map(name => [name, null])
);
const surfaceMasks = Object.fromEntries(
  surfaces.map(name => [name, null])
);

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
const CLUB_PROFILES = { // what was 3wood angle
  "driver" : {name:"Driver",  launchAngle: 12 ,   maxPower: 14,     minSwingSpin: 0,    maxSwingSpin: 1,     spinRate: 1,     drag: 0.00107,  carry: 275},
  "wood" :   {name:"3 Wood",  launchAngle: 11.2 , maxPower: 11.97,  minSwingSpin: 0,    maxSwingSpin: 0.9,   spinRate: 2.25,  drag: 0.00121,  carry: 243},
  "3i" :     {name:"3 Iron",  launchAngle: 12.3 , maxPower: 11.62,  minSwingSpin: 0,    maxSwingSpin: 0.9,   spinRate: 2.44,  drag: 0.00145,  carry: 212},
  "5i" :     {name:"5 Iron",  launchAngle: 13.3 , maxPower: 9.14,   minSwingSpin: 0,    maxSwingSpin: 0.9,   spinRate: 4.32,  drag: 0.00145,  carry: 194},
  "7i" :     {name:"7 Iron",  launchAngle: 16.1 , maxPower: 7.42,   minSwingSpin: 0.2,  maxSwingSpin: 0.9,   spinRate: 5.22,  drag: 0.00145,  carry: 172},
  "9i" :     {name:"9 Iron",  launchAngle: 20.4 , maxPower: 5.75 ,  minSwingSpin: 0.34, maxSwingSpin: 1,     spinRate: 7.2,   drag: 0.00145,  carry: 148},
  "gap" :    {name:"56°",     launchAngle: 26.7 , maxPower: 4.9,    minSwingSpin: 0.51, maxSwingSpin: 1,     spinRate: 8.35,  drag: 0.00162,  carry: 120},
  "lob" :   {name:"Lob Wedge", launchAngle: 30.5 ,maxPower: 4.9 ,   minSwingSpcin: 0.32, maxSwingSpin: 1,     spinRate: 13,    drag: 0.00238,  carry: 92},
  "putter" : {name:"Putter", launchAngle:  0.0 ,  maxPower: 3.0 ,   minSwingSpin: 0.2,  maxSwingSpin: 1,     spinRate: 0.0,   drag: 0.0,      carry: 60},
}
let currentClub = CLUB_PROFILES.driver; // default

const HOLE_DICT = {
  "aug12": {par:3, tee:[47.9,24.75],  pins:[[48.48,68.70],[46.63,66.60],[50.73,71.04],[52.39,71.67]]},
  "tpc17": {par:3, tee:[40,20],       pins:[[50,75]]},
}
const txtScaleMain = 200; // 10=big 50=small
const txtScaleExtra1 = 35; 
const mainMixWt = .12 // default 50/50 mix

async function createSurfaceTexturesAsync() {
  const loader = new THREE.TextureLoader();
  const surfaceAssignments = {
    mask1: { r: 'bounds',    g: 'rough',       b: 'fairway',     a: 'fairway' },
    mask2: { r: 'teebox',     g: 'green',      b: 'green_edge' },
    mask3: { r: 'water',     g: 'water_edge'},
    mask4: { r: 'bunker',     g: 'dirt'}
  };


  function loadTexture(url, isColorTex = true) {
    return new Promise((resolve, reject) => {
      loader.load(
        url,
        tex => {
          tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
          tex.encoding = isColorTex ? THREE.sRGBEncoding : THREE.LinearEncoding;
          resolve(tex);
        },
        undefined,
        err => reject(`Failed to load texture: ${url}`)
      );
    });
  }

  console.log("\t2d. Loading Shadowmap...");

  const uniforms = {
    uRepeat: { value: new THREE.Vector2(txtScaleMain, txtScaleMain) },
    uRepeat2: { value: new THREE.Vector2(txtScaleExtra1, txtScaleExtra1) },
    mainMixWt: { value: mainMixWt },  
    uBakedShadowTex: { value: await loadTexture('/shadow_maps/baked_shad_'+HOLE_NAME+'.png') },
    holeCenter: {value: new THREE.Vector2(
      (HOLE_LOC.x / 100),
      (HOLE_LOC.z / 100),
    )},
    holeRadius: {value: CUP_RADIUS/OPT_SIZE}
};
  console.log("\t\t-- Done Loading Shadows!");



  console.log("\t2e. Loading Surface Textures...");

  const promises = [];

  for (const [maskName, channels] of Object.entries(surfaceAssignments)) {
    const maskUniformName = `u${maskName.charAt(0).toUpperCase() + maskName.slice(1)}`;
    const maskURL = `/surface_masks/${maskName}_${HOLE_NAME}.png`;
    promises.push(
      loadTexture(maskURL, false).then(tex => {
        uniforms[maskUniformName] = { value: tex };
      })
    );

    for (const [channel, surface] of Object.entries(channels)) {
      const texUniformName = `u${surface.charAt(0).toUpperCase() + surface.slice(1)}Tex`;
      const texURL = `/textures/${surface}.jpg`;
      promises.push(
        loadTexture(texURL).then(tex => {
          uniforms[texUniformName] = { value: tex };
        })
      );
    }
  }

  await Promise.all(promises);
  console.log("\t\t-- Done Loading Textures!");
  console.log("3. Building Shader");

  const terrainMaterial = new THREE.ShaderMaterial({
    transparent:true,
    uniforms,
    vertexShader: `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
    uniform float mainMixWt;

    uniform sampler2D uBakedShadowTex;

    uniform sampler2D uMask1;
    uniform sampler2D uMask2;
    uniform sampler2D uMask3;
    uniform sampler2D uMask4;

    uniform sampler2D uBoundsTex;
    uniform sampler2D uDirtTex;
    uniform sampler2D uRoughTex;
    uniform sampler2D uFairwayTex;

    uniform sampler2D uTeeboxTex;
    uniform sampler2D uGreenTex;
    uniform sampler2D uGreen_edgeTex;

    uniform sampler2D uBunkerTex;
    uniform sampler2D uWaterTex;
    uniform sampler2D uWater_edgeTex;

    uniform vec2 uRepeat;
    uniform vec2 uRepeat2;

    uniform vec2 holeCenter;
    uniform float holeRadius;

    varying vec2 vUv;

    void main() {
      vec2 uvTiled1 = vUv * uRepeat;
      vec2 uvTiled2 = vUv * uRepeat2;

      vec4 m1 = texture2D(uMask1, vUv);
      vec4 m2 = texture2D(uMask2, vUv);
      vec4 m3 = texture2D(uMask3, vUv);
      vec4 m4 = texture2D(uMask4, vUv);

      vec3 colorSum = vec3(0.0);
      float weightSum = 0.0;

      // Mask1
      if (m1.r > 0.01) {
        vec3 sample_color = mix(
          texture2D(uBoundsTex, uvTiled1).rgb,
          texture2D(uBoundsTex, uvTiled2).rgb,
          mainMixWt
        );
        colorSum += sample_color * m1.r;
        weightSum += m1.r;
      }
      if (m1.g > 0.01) {
        vec3 sample_color = mix(
          texture2D(uRoughTex, uvTiled1).rgb,
          texture2D(uRoughTex, uvTiled2).rgb,
          mainMixWt
        );
        colorSum += sample_color * m1.g;
        weightSum += m1.g;
      }
      if (m1.b > 0.01) {
        vec3 sample_color = mix(
          texture2D(uFairwayTex, uvTiled1).rgb,
          texture2D(uFairwayTex, uvTiled2).rgb,
          mainMixWt
        );
        colorSum += sample_color * m1.b;
        weightSum += m1.b;
      }

      // Mask2
      if (m2.r > 0.01) {
        vec3 sample_color = mix(
          texture2D(uTeeboxTex, uvTiled1).rgb,
          texture2D(uTeeboxTex, uvTiled2).rgb,
          mainMixWt
        );
        colorSum += sample_color * m2.r;
        weightSum += m2.r;
      }
      if (m2.g > 0.01) {
        vec3 sample_color = mix(
          texture2D(uGreenTex, uvTiled1).rgb,
          texture2D(uGreenTex, uvTiled2).rgb,
          mainMixWt
        );
        colorSum += sample_color * m2.g;
        weightSum += m2.g;
      }
      if (m2.b > 0.01) {
        vec3 sample_color = mix(
          texture2D(uGreen_edgeTex, uvTiled1).rgb,
          texture2D(uGreen_edgeTex, uvTiled2).rgb,
          mainMixWt
        );
        colorSum += sample_color * m2.b;
        weightSum += m2.b;
      }

      // Mask3
      if (m3.r > 0.01) {
        vec3 sample_color = mix(
          texture2D(uWaterTex, uvTiled1).rgb,
          texture2D(uWaterTex, uvTiled2).rgb,
          mainMixWt
        );
        colorSum += sample_color * m3.r;
        weightSum += m3.r;
      }
      if (m3.g > 0.01) {
        vec3 sample_color = mix(
          texture2D(uWater_edgeTex, uvTiled1).rgb,
          texture2D(uWater_edgeTex, uvTiled2).rgb,
          mainMixWt
        );
        colorSum += sample_color * m3.g;
        weightSum += m3.g;
      }

      // Mask4
      if (m4.r > 0.01) {
        vec3 sample_color = mix(
          texture2D(uBunkerTex, uvTiled1).rgb,
          texture2D(uBunkerTex, uvTiled2).rgb,
          mainMixWt
        );
        colorSum += sample_color * m4.r;
        weightSum += m4.r;
      }
      if (m4.g > 0.01) {
        vec3 sample_color = mix(
          texture2D(uDirtTex, uvTiled1).rgb,
          texture2D(uDirtTex, uvTiled2).rgb,
          mainMixWt
        );
        colorSum += sample_color * m4.g;
        weightSum += m4.g;
      }

      if (weightSum < 0.01) discard;

      vec3 color = colorSum / weightSum;


      float shadow = texture2D(uBakedShadowTex, vUv).g * 1.8 ;
      color = mix(color, color * shadow, 0.7);

      gl_FragColor = vec4(color, 1.0);

      
      float distToHole = distance(vUv, holeCenter);
      if (distToHole < holeRadius) {
          gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
      }
    }

    `
  });

  return terrainMaterial;
}




////////////////////////////////////////////////////////////////////////////////////
// document.getElementById('applyCamera').addEventListener('click', () => {
//   const shiftX = parseFloat(document.getElementById('shiftX').value) || 0;
//   const shiftZ = parseFloat(document.getElementById('shiftZ').value) || 0;

//   const camX = shiftX + parseFloat(document.getElementById('camX').value) || 0;
//   const camZ = shiftZ + parseFloat(document.getElementById('camZ').value) || 0;
//   const lookX = shiftX + parseFloat(document.getElementById('lookX').value) || 0;
//   const lookZ = shiftZ + parseFloat(document.getElementById('lookZ').value) || 0;
  
//   views["custom"] = [camX,camZ,lookX,lookZ]
//   setCameraView("custom")
// });



//////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////  ANIMATE  ///////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ANIMATE



function animate() {
  requestAnimationFrame(animate);
  
  curFrame += 1;
  if (OPT_ORBIT) {
    controls.update();
  }
  if (GAME_MANAGER.ballInMotion) {
    ball.update(); // animate ball movement
  }
  CAM_MANAGER.update(); // animate camera movement

  
  if (ball.inHole) {
    if (ball.position.y < holePosition.y - 1) {
      ball.velocity.set(0, 0, 0);
      HOLE_MANAGER.holeDone = true
      console.log("HOLE DONE!!!!!!!!!!!!")
    } else {
      console.log(ball.position)
    }
  }

  renderer.render(scene, CAMERA);
}

// Responsive canvas
window.addEventListener('resize', () => {
  // CAMERA.aspect = window.innerWidth / window.innerHeight;
  // CAMERA.updateProjectionMatrix();
  // renderer.setSize(window.innerWidth, window.innerHeight);
  if (window.innerWidth > window.innerHeight){
    renderer.setSize(window.innerHeight * 16/9, window.innerHeight);
  } else {
    renderer.setSize(window.innerWidth, window.innerWidth * 9/16);
  }
});

function createAvatar() {
  const avatarR = 2
  const avatarHt = 11.9
  const pantsHt = .45
  const shirtHt = .4
  const headR = .15

  const pantsGeometry = new THREE.CylinderGeometry(avatarR*.8, avatarR*.6, avatarHt*pantsHt, 16);
  const pantsMaterial = new THREE.MeshStandardMaterial({ color: 0x141414 });
  const pants = new THREE.Mesh(pantsGeometry, pantsMaterial);
  
  const shirtGeometry = new THREE.CylinderGeometry(avatarR*.5, avatarR*.8, avatarHt*shirtHt, 16);
  const shirtMaterial = new THREE.MeshStandardMaterial({ color: 0xbf0b26 });
  const shirt = new THREE.Mesh(shirtGeometry, shirtMaterial);
  shirt.position.set(0,avatarHt*(pantsHt/2 + shirtHt/2),0)
  pants.add(shirt)
  
  const headGeometry = new THREE.SphereGeometry(avatarHt*headR, 16, 16);
  const headMaterial = new THREE.MeshStandardMaterial({ color: 0xedb787 });
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.set(0,avatarHt*(pantsHt/2 + shirtHt + headR/2 + .02),0)
  pants.add(head)

  pants.position.set(0,pantsHt*avatarHt,0)
  scene.add(pants);
  return pants
}

function createFlag() {
  console.log("\t5b. Creating Flag Mesh");
  const flagstickR = .75 /6
  const flagW = 20 / 6
  const flagH = flagW * 14/20

  const flagStickGeometry = new THREE.CylinderGeometry(flagstickR, flagstickR, FLAGSTICK_HT, 12);
  const flagStickMaterial = new THREE.MeshStandardMaterial({ color: 0xffef40 });
  const flagStick = new THREE.Mesh(flagStickGeometry, flagStickMaterial);

  const flagGeometry = new THREE.PlaneGeometry(flagW, flagH);
  const flagMaterial = new THREE.MeshStandardMaterial({
    color: 0xedd51c,
    side: THREE.DoubleSide
  });
  const flag = new THREE.Mesh(flagGeometry, flagMaterial);
  
  flag.position.set(flagW/2, FLAGSTICK_HT/2 - flagH/2 - 1/6, 0);
  // flag.rotation.y = Math.PI / 2; // Rotate to face outwards todo: rotate with wind
  flagStick.add(flag);

  const cupBaseGeometry = new THREE.CylinderGeometry(3, 3, .01, 12);
  const cupBaseMaterial = new THREE.MeshStandardMaterial({
    color: 0x000000,
    side: THREE.DoubleSide
  });
  const cupBase = new THREE.Mesh(cupBaseGeometry, cupBaseMaterial);
  
  cupBase.position.set(0, -FLAGSTICK_HT/2 , 0);
  flagStick.add(cupBase);

  flagStick.position.set(0,15,0); //default position
  scene.add(flagStick);
  return flagStick
}

let holePosition = null;
const holeExposed = .02
const dropSpeed = .18


function createCup(holeRadius = CUP_RADIUS) {
  console.log("5. Building Cup Mesh");

  const segments = 32;
  const wallRadius = holeRadius;
  const cupHeight = CUP_DIG;

  // Bottom section (white) — 0.8 * total height
  const cupGeometry = new THREE.CylinderGeometry(wallRadius, wallRadius, cupHeight, segments, 1, true);
  
  const textureLoader = new THREE.TextureLoader();
  const cupTexture = textureLoader.load('textures/cup_texture.jpg');
  cupTexture.wrapS = THREE.RepeatWrapping;
  cupTexture.wrapT = THREE.ClampToEdgeWrapping;
  cupTexture.repeat.set(1, 1); // Stretch horizontally
  
  const cupMaterial = new THREE.MeshStandardMaterial({ 
    map: cupTexture,
    metalness: 0.3, 
    roughness: 0.3,  
    side: THREE.BackSide  
  });
  const cupMesh = new THREE.Mesh(cupGeometry, cupMaterial);


  cupMesh.position.set(0, 10, 0); // default meaningless position
  scene.add(cupMesh);

  return cupMesh;
}


let slopeSpeed = .035 // influence, different from friction
const stopThreshold = 0.02; // Adjust as needed
const GROUND_THRESHOLD = 0.01; // threshold for contact with ground
const MIN_BOUNCE_VEL = .05 // when less than this will snap to ground
class Ball {
  constructor(showHelper=false) {
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
    this.maxFlightPoints = 300; // Limit number of trail points

  }

  createMesh() {
    const ballGeometry = new THREE.SphereGeometry(BALL_RADIUS, 16, 16);
    const ballMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffff,
      roughness: 0.1, // Lower = shinier
      metalness: 0.0, 
    });
    const ballMesh = new THREE.Mesh(ballGeometry, ballMaterial);

    scene.add(ballMesh);
    console.log("Game Ball Created")

    // --- Transparent helper sphere ---
    const helperGeometry = new THREE.SphereGeometry(BALL_RADIUS * 18, 16, 16);
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
    const flightPrevMaterial = new THREE.LineBasicMaterial({ color: 0x1f0c0c, transparent: true, opacity: 0.35 });
    const flightPathPrev = new THREE.Line(flightPrevGeometry, flightPrevMaterial);
    scene.add(flightPathPrev);

      
    return [ballMesh, helperMesh, flightPath, flightPathPrev];
  }

  get position() {
    return this.mesh.position;
  }

  teeUp(x, z) {
    // Input is course scale
    const y = getHeightAt(x, z); // Replace with your global height lookup function
    this.position.set(x, y + BALL_RADIUS + .02, z);
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
    if (!terrainMesh) return;
    if (!this.inHole) this.checkInHole();

    // GET BASIC INITIAL DATA
    const pos = this.position;    
    const vel = this.velocity;
    const speed = vel.length()
    const terrainHeight = getHeightAt(pos.x, pos.z);

    // GET CURRENT SURFACE PARAMS
    const surfaceType = getSurfaceTypeAt(pos.x, pos.z);
    const surface = SURFACE_PROFILES[surfaceType] || SURFACE_PROFILES.bounds;
    const { friction,bounceDecay, rollResistance, ballRaise } = surface;

////////////////////////////////////////
// APPLY PHYSICS ///////////////////////
////////////////////////////////////////

    //// AIRBORN BALL (3D) ///////////////////////////////////////////////
    if (this.isAirborn) {
      this.mesh.material.color.set(0x00ff00); // todo: remove , for tracking

      // GRAVITY
      vel.y +=  GRAVITY ;


      //// IF INITIAL FLIGHT (BEFORE 1ST BOUNCE) ////
      if (!this.firstBounce) {

      // AIR DRAG
        const dragMagnitude = this.drag * (speed**2);
        const dragVec = vel.clone().normalize().multiplyScalar(-dragMagnitude);
        vel.add(dragVec)


      // LIFT (MAGNUS EFFECT)  -  perpendicular to both spin and velocity:
          const liftDir = new THREE.Vector3().crossVectors(this.spinVec, vel).normalize();
          
          const liftMag = (vel.length())**2 * LIFT_COEF * this.flightSpinRate; 
          const liftVec = liftDir.multiplyScalar(liftMag);
          vel.add(liftVec)

      } //// END IF INITIAL FLIGHT


      // IF GROUND COLLISION //////////////
      if (pos.y - BALL_RADIUS <= terrainHeight + GROUND_THRESHOLD && vel.y < 0) {
        console.log("~~~~ BOUNCE ~~");
        console.log(); // force new line
        
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
          console.log(`CARRY: ${(carryDist/6).toFixed(1)} yd.`)
          console.log(`LAND ANG: ${(landAngDeg).toFixed(1)}°`)

          const endTime = performance.now()
          const hangTime = endTime - startDropTime
          // console.log(`HANG: ${(hangTime/1000).toFixed(2)} s`)
        } // END LOG 1ST BOUNCE DATA


        // BOUNCE EFFECTS
        const xzBounceDecay = friction**GROUND_CONTACT_TIME
        const ySpinDecay = 1 - (this.groundSpinRate*this.swingSpin / 20)*.56

        vel.x *= xzBounceDecay ;
        vel.y *=(-bounceDecay * ySpinDecay);
        vel.z *= xzBounceDecay;
          // TODO: sloped bounce

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
        vel.add(groundSpinVec)
        console.log(groundSpinVec)

        // RESET BALL TO GROUND HEIGHT
        pos.y = terrainHeight + BALL_RADIUS;

        // CHECK IF TRANSITION TO ROLLING
        if (Math.abs(vel.y) < MIN_BOUNCE_VEL ) {
          console.log("~~~~~~~~SNAP 2 GROUND ~~")
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
        console.log(`APEX: ${(apex/6).toFixed(1)} yd.`)
        this.reachedApex = true

      } else {
        this.maxHt = newMaxHt
      }

    } //// END OF 3D BALL FLIGHT ///////////////// snaps to terrain ht /////////
    
    
    //// GROUND BALL (2D) ///////////////// snaps to terrain ht /////////
    else { 
      if (!this.inHole) {
        // --- SLOPE INFLUENCE ---
        const slope2D = getSlopeAt(pos.x, pos.z); // Vector2 (x,z)
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
          this.mesh.material.color.set(0xff0000);
        } else {
          // Return to normal color
          this.mesh.material.color.set(0xffffff);
        }

        // --- STOPPING LOGIC ---
        if (speed < stopThreshold) {
          if (!this.firstStop){
            this.firstStop = true
              
            const initPos = this.initPos;
            const stopPos = new THREE.Vector3(pos.x,0,pos.z);
            const initPosXZ = new THREE.Vector3(initPos.x,0,initPos.z)
            const rollDist = Math.abs(stopPos.distanceTo(initPosXZ)) - this.carry
            console.log(`ROLL: ${(rollDist/6).toFixed(1)} yd.`)
          }
          vel.set(0, 0, 0);
          
          // UPDATE MANAGERS
          GAME_MANAGER.ballInMotion = false;
          CAM_MANAGER.finishShot()

          // updateAimLine()
        }

        // --- UPDATE POSITION ---
        pos.add(vel);

        // --- STICK TO TERRAIN ---
        pos.y = terrainHeight + BALL_RADIUS + ballRaise;

      } else {
        // --- DROP INTO HOLE ---
        const dx = pos.x - holePosition.x;
        const dz = pos.z - holePosition.z;

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
    // UPDATE MANAGERS
    GAME_MANAGER.ballInMotion = true;
    CAM_MANAGER.trackShot(aimAngleRad)

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
    this.swingSpin = swingSpin;
    this.spinVec = spinVec;
    this.drag = drag;

    // flight status
    this.isAirborn = true;
    this.firstBounce = false;
    this.firstStop = false;

    // tracking data
    this.initPos = this.position.clone();
    this.carry = 0;
    this.maxHt = -100000;
    this.reachedApex = false;

    this.inHole = false;
    this.dropY = 0;

    console.log("STRIKING")
    startDropTime = performance.now()
  }

  checkInHole() {
    if (!holePosition) return false;

    const dx = this.position.x - holePosition.x;
    const dz = this.position.z - holePosition.z;
    const dy = this.position.y - holePosition.y;

    const distXZ = Math.sqrt(dx * dx + dz * dz);
    const isWithinHole = distXZ < holePosition.radius;
    const isLowEnough = dy < BALL_RADIUS + .05; // Slightly above bottom
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


class AimTools {
  constructor() {
    this.landingSpotlight = this.createSpotlightMesh();
    this.active = true;
  }

  createSpotlightMesh() {
    const spotlightRadius = 20;
    const spotlightGeometry = new THREE.CircleGeometry(spotlightRadius, 32);
    const spotlightMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00bfff,
      transparent: true, 
      opacity: 0.4, 
      side: THREE.DoubleSide
    });

    const spotlight = new THREE.Mesh(spotlightGeometry, spotlightMaterial);
    spotlight.rotation.x = -Math.PI/2
    scene.add(spotlight)
    
    return spotlight

    //     function warpCircleToTerrain(circleMesh, centerX, centerZ) {
    //   const geometry = circleMesh.geometry;
    //   geometry.computeBoundingBox();
    //   const positionAttr = geometry.attributes.position;

    //   for (let i = 0; i < positionAttr.count; i++) {
    //     const vx = positionAttr.getX(i);
    //     const vz = positionAttr.getZ(i);

    //     const worldX = centerX + vx;
    //     const worldZ = centerZ + vz;
    //     const height = getHeightAt(worldX, worldZ);

    //     positionAttr.setY(i, height - getHeightAt(centerX, centerZ)); // relative to center
    //   }

    //   positionAttr.needsUpdate = true;
    //   geometry.computeVertexNormals(); // optional if lighting is involved
    // }

  }
  update() {
    if (!this.active) return
    
    const ballX = ball.initPos.x || ball.position.x;
    const ballZ = ball.initPos.z || ball.position.z;

    // simFlight(club) // todo: make more accurate sim
    const carry = currentClub.carry * 6 * SWING_POWER
    const deltaX = - carry * Math.sin(THREE.MathUtils.degToRad(AIM_ANGLE))
    const deltaZ = - carry * Math.cos(THREE.MathUtils.degToRad(AIM_ANGLE))
    
    const aimX = ballX - deltaX 
    const aimZ = ballZ - deltaZ 
    // console.log("bZ="+ballZ)
    // console.log("dZ="+deltaZ)
    const aimY = getHeightAt(aimX, aimZ) + 1;
    
    this.landingSpotlight.position.set(aimX,aimY,aimZ)
  }
}

const TRACKING_DELAY = 80 // # frames it stays on tee cam before tracking
const RESTING_TIME = 80 // # frames it stays on resting position after shot is done
class CamManager {
  constructor() {
    console.log("Hi from Cam")
    this.cam = true;
    this.tracking = false;
    this.trackingAngle = false;
    this.trkDelayTime = 0;
    this.resting = false;
    this.restTime = 0;
  }

  setTeeCam(facePinAngle) {
    // assumes ball is on tee
    const yCamOffset = 15
    const yLookOffset = -5
    const xzOffset = -50;
    const xOffset = xzOffset * Math.cos(facePinAngle)
    const zOffset = xzOffset * Math.sin(facePinAngle)
    console.log("xOffset: "+xOffset)
    console.log("zOffset: "+zOffset)

    CAMERA.position.set(
      ball.position.x + xOffset, 
      ball.position.y + yCamOffset , 
      ball.position.z + zOffset
    );
    CAMERA.lookAt(new THREE.Vector3(HOLE_MANAGER.pinPos.x, HOLE_MANAGER.pinPos.y + yCamOffset , HOLE_MANAGER.pinPos.z)); 
  }

  trackShot(aimAngleRad) {
    this.tracking = true;
    this.trackingAngle = aimAngleRad;
  }
  finishShot() {
    this.tracking = false;
    this.resting = true;
    this.trkDelayTime = 0;
  }
  update () {
    if (this.tracking){
      if (ball.reachedApex) {
        // set tracking position
        console.log("CAM = side tracking");
        const lookX = ball.position.x
        const lookY = ball.position.y
        const lookZ = ball.position.z

        CAMERA.lookAt(
          lookX, 
          lookY, 
          lookZ
        );

        const lookDist = 100
        const camX = lookX + Math.cos(this.trackingAngle)*lookDist
        const camZ = lookZ + Math.sin(this.trackingAngle)*lookDist
        CAMERA.position.set(
          camX, 
          getHeightAt(camX,camZ) + 30, 
          camZ
        );
      } else {
        // stay on tee but zoom out and up
        // this.trkDelayTime ++;
        console.log("CAM = tee zoom")
        
        // zoom in
        const zoomSpeed = .1;
        const camX = CAMERA.position.x + Math.sin(this.trackingAngle)*zoomSpeed
        const camZ = CAMERA.position.z + Math.cos(this.trackingAngle)*zoomSpeed
        
        // ramp y zoom
        let camY = CAMERA.position.y
        const minY = getHeightAt(camX,camZ);
        if (curY > minY + 0.2) {
          camY = (camY - minY) * .6 + minY;
        }
        CAMERA.position.set(
          camX, 
          camY, 
          camZ
        );


        
        const lookX = ball.position.x
        const lookY = ball.position.y
        const lookZ = ball.position.z

        CAMERA.lookAt(
          lookX, 
          lookY, 
          lookZ
        );

      }

    }
    else if (this.resting) {
      console.log("CAM = resting");
      if (this.restTime < RESTING_TIME) {
        this.restTime ++;
        const minFOV = 15;
        if (CAMERA.fov > 15.1) {
          const zoom = (CAMERA.fov - minFOV) * .97 + minFOV;
          this.setFOV(zoom);
        }
      } else {
        // end rest shot and stop udpating camera
        this.resting = false;
        this.setFOV(CAM_FOV);
        console.log("shot done!")
      }
    }
  }

  setFOV(newFOV){
    CAMERA.fov = newFOV;
    CAMERA.updateProjectionMatrix() 
  }
}

class UIManager {
  constructor() {
    console.log("Hi from UI")
    this.ui = true;
  }
}

class GameManager {
  constructor() {
    // COURSE INFO AND USER THRU
    this.routing = ["aug12","tpc17","pb7","qh16","sta1","rtr8","etc."] //todo: fake data
    this.maxHoles = 1 // 9, 3
    this.currentHole = 1; // start on 1

    // SCORES
    this.scorecard = []; // e.g., [{ hole: 1, strokes: 3 }, ...]
    this.fieldScores = {"McIlroy":-10, "Scheffler":-12, "Rahm":-8, "Schauffele":-5,"Etc.":0} //todo: fake data

    // BALL STATE
    this.ballInMotion = false;

    // SETTINGS
    this.settings = {greenSpeed: 1, wind: 1, tees:"black", cupRadius:CUP_RADIUS} //todo: fake data

    // REUSABLES
    ball = new Ball() // ball, flag, cup, avatar
    this.cup = createCup();
    this.flag = createFlag();
    this.avatar = createAvatar();
    // this.teeMarkers = createTeeMarkers() // todo: add tee globes

    CAM_MANAGER = new CamManager()
    UI_MANAGER = new UIManager()
  }
  
  async loadHole() {
    console.log(`Loading hole ${this.currentHole}`);
    const holeName = this.routing[this.currentHole - 1] // 0-index it

    HOLE_MANAGER = new HoleManager(holeName);
    await HOLE_MANAGER.loadTerrain();
    HOLE_MANAGER.setupHole();

    // CAM_MANAGER = new CamManager()
    // UI_MANAGER = new UIManager()

  }

  setPinLocation(x,y,z) {
    console.log("Moving pin to:")
    console.log("\t"+x)
    console.log("\t"+y)
    console.log("\t"+z)


    // input is at course scale
    // this.cup.position.set(x, y - (CUP_DIG / 2) + 10, z)
    this.cup.position.set(x, y, z)
    this.flag.position.set(x, y + FLAGSTICK_HT/2 - CUP_DIG, z);
    console.log("Pin Moved to:")
    console.log("\t"+this.cup.position.x)
    console.log("\t"+this.cup.position.y)
    console.log("\t"+this.cup.position.z)

  }

  registerStroke() {
    this.strokes += 1;
  }

  finishHole() {
    this.scorecard.push({
      hole: this.currentHole,
      strokes: this.strokes,
    });

    if (this.currentHole < this.maxHoles) {
      this.startHole(this.currentHole + 1);
    } else {
      this.endGame();
    }
  }

  endGame() {
    console.log("Game over!");
    console.log("Scorecard:", this.scorecard);
    // Show scorecard screen, allow restart, etc.
  }

  
}

class HoleManager {
  constructor(holeName) {
     this.terrainMesh =  null;
     this.holeName = holeName;
     this.holeDone = false;

     this.pinPos = {
      x: false,
      y: false,
      z: false,
      radius: CUP_RADIUS
    };
  }

  async loadTerrain() {
    this.terrainMesh = await makeTerrainMesh(this.holeName)
  }

  setupHole() {
    console.log("HoleManager is setting up Hole")
    // GET PIN + UPDATE CUP/FLAG Objects
    const pins = HOLE_DICT[this.holeName]["pins"]
    const randomPin = pins[ Math.floor( Math.random() * pins.length ) ] // select random pin
    console.log("pins chosen:")
    console.log(randomPin)
    const pinXnorm = randomPin[0]
    const pinZnorm = randomPin[1]
    const pinX = (pinXnorm - 50 )/100 * OPT_SIZE
    const pinZ = (-pinZnorm + 50 )/100 * OPT_SIZE
    const pinY = getHeightAt(pinX,pinZ)
    this.pinPos.x = pinX
    this.pinPos.y = pinY
    this.pinPos.z = pinZ

    console.log("Telling pin to be moved to ")
    console.log("\t"+pinX)
    console.log("\t"+pinY)
    console.log("\t"+pinZ)
    GAME_MANAGER.setPinLocation(this.pinPos.x,this.pinPos.y,this.pinPos.z)

    // TEE POS
    console.log("Getting tee pos:")
    const teeXnorm = HOLE_DICT[this.holeName]["tee"][0]
    const teeZnorm = HOLE_DICT[this.holeName]["tee"][1]
    const teeX = (teeXnorm - 50 )/100 * OPT_SIZE
    const teeZ = (-teeZnorm + 50 )/100 * OPT_SIZE

    // CAL PIN 2 TEE ANGLE
    const deltaX = pinX - teeX;
    const deltaZ = pinZ - teeZ;
    const facePinAngle = Math.atan(deltaZ / deltaX)
    console.log("deltaX:"+deltaX)
    console.log("deltaZ:"+deltaZ)
    console.log("angle:"+facePinAngle * 180/Math.PI)

    // NEW BALL
    ball.teeUp(teeX,teeZ)

    // MOVE AVATAR 
    const distFromBall = 6.5
    const xOffset = distFromBall * Math.sin(facePinAngle)
    const zOffset = distFromBall * Math.cos(facePinAngle)
    const avX = teeX + xOffset
    const avZ = teeZ + zOffset
    console.log("avXoff:"+xOffset)
    console.log("avZoff:"+zOffset)
    GAME_MANAGER.avatar.position.set(
      avX,
      getHeightAt(avX,avZ),
      avZ
    )

    // SET CAM TO TEE
    CAM_MANAGER.setTeeCam(facePinAngle)
  }
  
  restartHole() { // mainly for testing
    GAME_MANAGER.ballInMotion = false;
    console.log(`ReStarting hole ${GAME_MANAGER.currentHole}`);
    this.setupHole()

    // HOLE_MANAGER.setupHole(); 
  }
}


let aimPathMesh;

function addAimLine() {
  const geometry = new THREE.BufferGeometry();
  const material = new THREE.MeshBasicMaterial({
    color: 0x00d9ff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    depthTest: true,
  });

  aimPathMesh = new THREE.Mesh(geometry, material);
  aimPathMesh.renderOrder = 2;
  scene.add(aimPathMesh);
  updateAimLine()
}



function updateAimLine() {
  const angleDeg = 180 - parseFloat(document.getElementById('puttAngle').value)
  const power = parseFloat(document.getElementById('puttPower').value)

  const angleRad = angleDeg * (Math.PI / 180);
  const dirX = Math.sin(angleRad);
  const dirZ = Math.cos(angleRad);

  const segments = 50;
  const pathLength = Math.min(power * 55);
  const width = 0.4;

  const positions = [];
  const indices = [];

  const startX = ball.position.x;
  const startZ = ball.position.z;

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = startX + dirX * pathLength * t;
    const z = startZ + dirZ * pathLength * t;
    const y = getHeightAt(x, z) + 0.05;

    // Offset to get left/right edge of strip
    const offsetX = -dirZ * width * 0.5;
    const offsetZ = dirX * width * 0.5;

    // Left and Right vertices
    positions.push(x + offsetX, y, z + offsetZ); // Left
    positions.push(x - offsetX, y, z - offsetZ); // Right

    if (i < segments) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;

      // Two triangles (quad)
      indices.push(a, c, b);
      indices.push(c, d, b);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  aimPathMesh.geometry.dispose(); // Clean up old geometry
  aimPathMesh.geometry = geometry;
}











document.getElementById('swingPower').addEventListener('change', (e) => { 
  SWING_POWER = parseFloat(document.getElementById('swingPower').value);
  // console.log("SW_PWR = "+SWING_POWER)
  // aimTools.update();

});
document.getElementById('strikeAimAngle').addEventListener('change', (e) => { 
  AIM_ANGLE = 180 - parseFloat(document.getElementById('strikeAimAngle').value);
  // console.log("AIM = "+AIM_ANGLE)
  // aimTools.update();

});







document.getElementById('strikeButton').addEventListener('click', () => {
  const aimAngle = 180 - parseFloat(document.getElementById('strikeAimAngle').value);
  const swingPower = parseFloat(document.getElementById('swingPower').value);
  const swingSpin = parseFloat(document.getElementById('swingSpin').value);

  setupSwing(aimAngle, swingPower, swingSpin);
});

function setupSwing(userAimAngle, userSwingPower, userSwingSpin) {
  console.log("Setup Swing with ")
  console.log(currentClub.name)

  // GET CLUB PROPERTIES
  const drag = currentClub.drag;
  const spinRate = currentClub.spinRate;
  const clubPower = currentClub.maxPower;

  const launchAngle = currentClub.launchAngle;
  const launchAngleRad = launchAngle * (Math.PI / 180);

  // GET USER INPUTS
  const power = userSwingPower * clubPower
  const aimAngleRad = userAimAngle * (Math.PI / 180);
  
  const minSS = currentClub.minSwingSpin;
  const maxSS = currentClub.maxSwingSpin;
  const swingSpinClamped = userSwingSpin*(maxSS-minSS) + minSS +  GND_SPIN_CONST


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
  ball.strikeBall(aimAngleRad,shotVel, spinVec, spinRate, drag, swingSpinClamped);
};




document.getElementById('clubSelect').addEventListener('change', (e) => {
  const selected = e.target.value;
  if (CLUB_PROFILES[selected]) {
    currentClub = CLUB_PROFILES[selected];
    console.log(`Club set to ${selected}:`, currentClub);
    
    // // Optionally update any UI fields:
    // document.getElementById('strikeHtAngle').value = currentClub.launchAngle;
    // document.getElementById('clubPower').value = currentClub.maxPower;
    // document.getElementById('drag').value = currentClub.drag;
    // document.getElementById('spin').value = currentClub.spinRate;
  }
});

document.getElementById('fov').addEventListener('input', () => {
    const fov = parseFloat(document.getElementById('fov').value);
    CAMERA.fov = fov
    CAMERA.updateProjectionMatrix() 

});
document.getElementById('puttButton').addEventListener('click', () => {
  const angleDeg = 180 - parseFloat(document.getElementById('puttAngle').value);
  const power = parseFloat(document.getElementById('puttPower').value);

  const angleRad = THREE.MathUtils.degToRad(angleDeg);
  
  const vx = Math.sin(angleRad) * power;
  const vz = Math.cos(angleRad) * power;

  ball.velocity.set(vx, 0, vz);
});
document.getElementById('teeBallButton').addEventListener('click', () => {
  const posX = parseFloat(300);
  const posZ = parseFloat(930);
  ball.resetPos(posX,posZ)

});
document.getElementById('resetBallButton').addEventListener('click', () => {
  const posX = parseFloat(document.getElementById('posX').value);
  const posZ = parseFloat(document.getElementById('posZ').value);
  ball.resetPos(posX,posZ)
});
document.getElementById('puttAngle').addEventListener('input', () => {
  updateAimLine();
});

document.getElementById('puttPower').addEventListener('input', () => {
  updateAimLine();
});

////// ACTION ///////
let terrainMesh;
let heightData;
// await makeTerrainMesh() // MAKES TERRAIN, CUTS HOLE, AND MAKES FLAG

// addBall(15,22)


document.getElementById('startGame').addEventListener('click', () => {
  console.log("__________________")
  console.log("STARTING GAME")
  document.getElementById("gameMenu").classList.add("hide")
  GAME_MANAGER = new GameManager()
  GAME_MANAGER.loadHole()
  animate(); // todo: move to startGame 


});
document.getElementById('restartGame').addEventListener('click', () => {
  console.log("__________________")
  console.log("RESTARTING HOLE")
  HOLE_MANAGER.restartHole()


});
let startDropTime = 0

