import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { TextureLoader, PlaneGeometry, MeshPhongMaterial, Mesh } from 'three';
import './style.css';
import { CSG } from 'three-csg-ts'; // if using modules
import { update } from 'three/examples/jsm/libs/tween.module.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';


// 1yds = 3units/px
// 1 ft = 1 unit
console.log("1. Initializing")
const HOLE_NAME = "test"

// OPTIONS ///////////////////////////////
let ball = false;
let ballInHole = false;

let OPT_ORBIT = true;
let OPT_WALK = false;

const FILE_BUMP = `bump_${HOLE_NAME}.raw`
const OPT_VIEW = "tee1" // top/tee
const OPT_RES = 2048
const OPT_SIZE = 2048
const OPT_SIGHT_DIST = OPT_SIZE*1.2
const OPT_BUMPHEIGHT = 200

const CUP_RADIUS = 4.25/6
const CUP_DIG = 1
const BALL_RADIUS = 1.68 / 6

const HOLE_LOC = {x:15.5,z:23}; // test
// const HOLE_LOC = {x:52,z:71}; // aug12

const view_ht = 65
const look_ht = 57.5
const views = {
  "tee1": [45,0 , 45,80],
  "tee2": [54,0 , 54,80],
  "tee3": [63.2,0 , 63.2,80],
  "tee4": [72.5,0 , 72.5,80],
  "tee5": [82,0 , 82,80],
  
  "puttFr": [15.5,12, 15.5,26],
  "puttBk": [15.5,28, 15.5,19],
  "puttL": [11,22, 21,22],
  "puttR": [20,22, 10,22],
}


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

function updateWalkingCamera() {
  if (!OPT_WALK) return;

  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  dir.y = 0;
  dir.normalize();

  const right = new THREE.Vector3();
  right.crossVectors(camera.up, dir).normalize();

  let move = new THREE.Vector3();

  if (keyState['i']) move.add(dir);
  if (keyState['k']) move.sub(dir);
  if (keyState['j']) move.add(right);
  if (keyState['l']) move.sub(right);

  // 🔁 Rotation with Q/E or arrows
  if (keyState['arrowleft'] || keyState['u']) camera.rotation.y += rotateSpeed;
  if (keyState['arrowright'] || keyState['o']) camera.rotation.y -= rotateSpeed;

  if (move.lengthSq() > 0) {
    move.normalize();

    // Check if Shift is held
    const isSprinting = keyState['shift'];
    const currentSpeed = baseSpeed * (isSprinting ? sprintMultiplier : 1);

    move.applyAxisAngle(new THREE.Vector3(0, 1, 0), camera.rotation.y);
    move.multiplyScalar(currentSpeed);

    camera.position.add(move);

    const y = getHeightAt(camera.position.x, camera.position.z) + eyeLevel;
    camera.position.y = y;

    const lookTarget = camera.position.clone().add(new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation));
    camera.lookAt(lookTarget);
  }
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


const camera = new THREE.PerspectiveCamera(
  55, window.innerWidth / window.innerHeight, 0.1, OPT_SIGHT_DIST
);

let camX = ( views[OPT_VIEW][0]/100 - .5) * OPT_SIZE
let camZ = ( -views[OPT_VIEW][1]/100 + .5) * OPT_SIZE
let lookX = ( views[OPT_VIEW][2]/100 - .5) * OPT_SIZE
let lookZ = ( -views[OPT_VIEW][3]/100 + .5) * OPT_SIZE -1

camera.position.set(camX, view_ht,camZ); 
camera.lookAt(new THREE.Vector3(lookX, 5, lookZ)); 



// RENDERER
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
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
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(lookX, look_ht, lookZ);
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




async function makeTerrainMesh() {
  console.log("2. Building Terrain Mesh");

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
  const terrainMaterial = await createSurfaceTexturesAsync()

  terrainMesh = new THREE.Mesh(geometry, terrainMaterial);
  scene.add(terrainMesh);

  console.log("4. Terrain Added to Scene");

  cutHole(HOLE_LOC.x, HOLE_LOC.z);
  // cutHole(46, 73);
  // cutHole(44, 70);

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

const SURFACE_PROFILES = {
  bounds:     {friction: 0.60 ,   bounceDecay: 0.20, rollResistance: 0.90,  ballRaise: -BALL_RADIUS*1.4 } ,
  dirt:       {friction: 0.70 ,   bounceDecay: 0.35, rollResistance: 0.70,  ballRaise: -BALL_RADIUS*.8 } ,
  rough:      {friction: 0.70 ,   bounceDecay: 0.50, rollResistance: 0.80,  ballRaise: -BALL_RADIUS*.6 } ,
  fairway:    {friction: 0.95 ,   bounceDecay: 0.80, rollResistance: 0.50,  ballRaise: BALL_RADIUS/15 } ,
  teebox:     {friction: 0.93 ,   bounceDecay: 0.80, rollResistance: 0.50,  ballRaise: BALL_RADIUS*3 } ,
  green:      {friction: 0.98 ,   bounceDecay: 0.86, rollResistance: 0.15,  ballRaise: BALL_RADIUS/10 } ,
  green_edge: {friction: 0.97 ,   bounceDecay: 0.84, rollResistance: 0.30,  ballRaise: BALL_RADIUS/10 } ,
  bunker:     {friction: 0.30 ,   bounceDecay: 0.10, rollResistance: 0.90,  ballRaise: -BALL_RADIUS*1.1 } ,
  water:      {friction: 0.05 ,   bounceDecay: 0.00, rollResistance: 0.90,  ballRaise: -BALL_RADIUS*3 } ,
  water_edge: {friction: 0.99 ,   bounceDecay: 0.80, rollResistance: 0.10,  ballRaise: BALL_RADIUS/10 } ,
};


const txtScaleMain = 300; // 10=big 50=small
const txtScaleExtra1 = 40; 
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
document.getElementById('applyCamera').addEventListener('click', () => {
  const shiftX = parseFloat(document.getElementById('shiftX').value) || 0;
  const shiftZ = parseFloat(document.getElementById('shiftZ').value) || 0;

  const camX = shiftX + parseFloat(document.getElementById('camX').value) || 0;
  const camZ = shiftZ + parseFloat(document.getElementById('camZ').value) || 0;
  const lookX = shiftX + parseFloat(document.getElementById('lookX').value) || 0;
  const lookZ = shiftZ + parseFloat(document.getElementById('lookZ').value) || 0;
  
  views["custom"] = [camX,camZ,lookX,lookZ]
  setCameraView("custom")
});



//////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////  ANIMATE  ///////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ANIMATE
let holeDone = false
function animate() {
  requestAnimationFrame(animate);
  if (OPT_ORBIT) {
    controls.update();
  }
  if (ball && !holeDone) updateBall();

  if (ballInHole) {
    if (ball.position.y < holePosition.y - 1) {
      ballVelocity.set(0, 0, 0);
      holeDone = true
      console.log("HOLE DONE!!!!!!!!!!!!")
    } else {
      console.log(ball.position)
    }
  }
  updateWalkingCamera();

  renderer.render(scene, camera);
}
animate();

// Responsive canvas
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});






function makeFlag(x,y,z) {

  console.log("\t5b. Making Flag");

  const flagstickH = 20
  const flagstickR = .75 /6
  const flagW = 20 / 6
  const flagH = flagW * 14/20

  const flagStickGeometry = new THREE.CylinderGeometry(flagstickR, flagstickR, flagstickH, 12);
  const flagStickMaterial = new THREE.MeshStandardMaterial({ color: 0xffef40 });
  const flagStick = new THREE.Mesh(flagStickGeometry, flagStickMaterial);

  const flagGeometry = new THREE.PlaneGeometry(flagW, flagH);
  const flagMaterial = new THREE.MeshStandardMaterial({
    color: 0xedd51c,
    side: THREE.DoubleSide
  });
  const flag = new THREE.Mesh(flagGeometry, flagMaterial);
  
  flag.position.set(flagW/2, flagstickH/2 - flagH/2 - 1/6, 0);
  // flag.rotation.y = Math.PI / 2; // Rotate to face outwards
  flagStick.add(flag);

  
  const cupBaseGeometry = new THREE.CylinderGeometry(3, 3, .01, 12);
  const cupBaseMaterial = new THREE.MeshStandardMaterial({
    color: 0x000000,
    side: THREE.DoubleSide
  });
  const cupBase = new THREE.Mesh(cupBaseGeometry, cupBaseMaterial);
  
  cupBase.position.set(0, -flagstickH/2 , 0);
  flagStick.add(cupBase);

  const flagY = y + flagstickH/2 - CUP_DIG
  flagStick.position.set(x, flagY, z);
  scene.add(flagStick);
  
}

let holePosition = null;
const holeExposed = .02
const holeDepth = CUP_DIG
function cutHole(px, pz, holeRadius = CUP_RADIUS) {
  console.log("5. Cutting Hole");
  const holeX = (px - 50 )/100 * OPT_SIZE
  const holeZ = (-pz + 50 )/100 * OPT_SIZE
  const holeY = getHeightAt(holeX, holeZ, terrainMesh)
  

  const segments = 32;
  const wallRadius = holeRadius;
  const totalHeight = holeDepth;

  // Bottom section (white) — 0.8 * total height
  const cupHeight = totalHeight * 1;
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

  // Position them to stack seamlessly

  // topMesh.position.set(holeX, holeY - (topHeight / 2), holeZ);   // top sits above
  cupMesh.position.set(holeX, holeY - (cupHeight / 2), holeZ);   // cup sits below

  // scene.add(topMesh);
  scene.add(cupMesh);


  holePosition = {
    x: holeX,
    y: holeY,
    z: holeZ,
    radius: holeRadius
  };

  makeFlag(holeX,holeY,holeZ)

  // return resultMesh;
}


function addBall(px,pz) {
  console.log("7. Adding Ball")
  ball = new THREE.Mesh(
    new THREE.SphereGeometry(BALL_RADIUS, 16, 16),
    // new THREE.MeshStandardMaterial({ color: 0xffffff })
    new THREE.MeshStandardMaterial({ 
      color: 0xffffff,
      roughness: 0.1,        // Lower = shinier
      metalness: 0.0,         // Golf balls aren’t metallic
    })
  );
  
  const ballX = (px - 50 )/100 * OPT_SIZE
  const ballZ = (-pz + 50 )/100 * OPT_SIZE
  ball.position.set(ballX, getHeightAt(ballX, ballZ) + BALL_RADIUS + .02, ballZ); // start on terrain
  ball.velocity = new THREE.Vector3(5, 0, 0); // small push in X
  console.log("ball pos: "+ballX,",",ballZ)
  scene.add(ball);

  addAimLine(ballX,ballZ);
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



function updateAimLine(angleDeg=0, power=2) {
  const angleRad = angleDeg * (Math.PI / 180);
  const dirX = Math.sin(angleRad);
  const dirZ = Math.cos(angleRad);

  const segments = 50;
  const pathLength = Math.min(power * 30, 200);
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





let ballVelocity = new THREE.Vector3(0, 0, 0); // Initial push
// let ballVelocity = new THREE.Vector3(.5, 0, -0.15); // Initial push
let gravity = -0.005;
let friction = 0.985;
let slopeSpeed = .03 // influence, different from friction
const stopThreshold = 0.015; // Adjust as needed


function updateBall() {
  if (!ball || !terrainMesh) return;

  if (!ballInHole) checkBallInHole();
  const pos = ball.position;

  if (!ballInHole) {
    // --- SURFACE + PROFILE ---
    const surfaceType = getSurfaceTypeAt(pos.x, pos.z);
    const surface = SURFACE_PROFILES[surfaceType] || SURFACE_PROFILES.terrain;
 

    const { friction, bounceDecay, rollResistance, ballRaise} = surface;
    // --- SLOPE INFLUENCE ---
    const slope2D = getSlopeAt(pos.x, pos.z); // Vector2 (x,z)
    const slope3D = new THREE.Vector3(slope2D.x, 0, slope2D.y);
    const slopeForce = slope3D.multiplyScalar(slopeSpeed);
    ballVelocity.add(slopeForce);

    // --- FRICTION ---
    ballVelocity.multiplyScalar(friction);

    // --- ROLLING RESISTANCE (extra dampening when slow) ---
    const speed = ballVelocity.length();
    const slowThresh = stopThreshold * 5;

    if (speed < slowThresh) {
      const delta = ((slowThresh - speed) / slowThresh) ** 2;
      ballVelocity.multiplyScalar(1 - rollResistance * delta);
    }

    // --- STOPPING LOGIC ---
    if (speed < stopThreshold) {
      ballVelocity.set(0, 0, 0);
    }

    // --- UPDATE POSITION ---
    pos.add(ballVelocity);

    // --- STICK TO TERRAIN ---
    const terrainHeight = getHeightAt(pos.x, pos.z);
    pos.y = terrainHeight + BALL_RADIUS + ballRaise;

  } else {
    // --- DROP INTO HOLE ---
    const dx = pos.x - holePosition.x;
    const dz = pos.z - holePosition.z;

    const dropX = dx * -dropSpeed;
    const dropZ = dz * -dropSpeed;
    dropY = Math.min(dropY + dropSpeed / 10, 1);

    ballVelocity.set(dropX, -dropY, dropZ);
    pos.add(ballVelocity);
  }
}




let dropY = 0
const dropSpeed = .18
function checkBallInHole() {
  if (!holePosition || !ball) return false;

  const dx = ball.position.x - holePosition.x;
  const dz = ball.position.z - holePosition.z;
  const dy = ball.position.y - holePosition.y;

  const distXZ = Math.sqrt(dx * dx + dz * dz);
  const isWithinHole = distXZ < holePosition.radius;
  const isLowEnough = dy < BALL_RADIUS + .05; // Slightly above bottom
  const isSlowEnough = ballVelocity.length() < 0.3; // tweak threshold


  if (isWithinHole && isLowEnough && isSlowEnough) {
    console.log("\n\n🏌️ Ball is in the hole!\n\n");
    ballInHole = true;

    const dropX = dx * -dropSpeed
    const dropZ = dz * -dropSpeed
      

    ballVelocity.set(dropX,dropY,dropZ);
  } else {
    let inside = "O"
    let low = "O"
    let slow = "O"
    if (!isWithinHole) inside = "x" 
    if (!isLowEnough) low = "x" 
    if (!isSlowEnough) slow = "x" 
    // console.log(inside+" "+low+" "+slow)
    // console.log(dy)
  }
}




document.getElementById('puttButton').addEventListener('click', () => {
  const angleDeg = parseFloat(document.getElementById('puttAngle').value);
  const power = parseFloat(document.getElementById('puttPower').value);

  const angleRad = THREE.MathUtils.degToRad(angleDeg);
  
  const vx = Math.sin(angleRad) * power;
  const vz = Math.cos(angleRad) * power;

  ballVelocity.set(vx, 0, vz);
});
document.getElementById('resetBallButton').addEventListener('click', () => {
  const posX = parseFloat(document.getElementById('posX').value);
  const posZ = parseFloat(document.getElementById('posZ').value);

  const y = getHeightAt(posX, posZ); // Replace with your global height lookup function
  ball.position.set(posX, y + BALL_RADIUS + .02, posZ);
  ballVelocity.set(0, 0, 0);


  holeDone = false
  ballInHole = false
});
document.getElementById('puttAngle').addEventListener('input', () => {
  updateAimLine(parseFloat(puttAngle.value), parseFloat(puttPower.value));
});

document.getElementById('puttPower').addEventListener('input', () => {
  updateAimLine(parseFloat(puttAngle.value), parseFloat(puttPower.value));
});

////// ACTION ///////
let terrainMesh;
let heightData;
await makeTerrainMesh() // MAKES TERRAIN, CUTS HOLE, AND MAKES FLAG

addBall(48,74)