////////////////////////////////////////////////////////////////////////////////
// CAMERA , RENDER, LIGHT SETUP ////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
import * as G from '../utils/globals.js';
import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';


console.log("Init File: sceneSetup.js")
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////

const scene = new THREE.Scene();


//// CAMERAS
const orbitCam = new THREE.PerspectiveCamera(
  G.DEFAULT_CAM_FOV, 16/9, 0.01, G.OPT_SIGHT_DIST, 
  // fov, aspect, near, far
  // G.DEFAULT_CAM_FOV, window.innerWidth / window.innerHeight, 0.1, OPT_SIGHT_DIST
);
orbitCam.name = "orbit"
const gameCam = new THREE.PerspectiveCamera(
  G.DEFAULT_CAM_FOV, 16/9, 0.01, G.OPT_SIGHT_DIST
);
gameCam.name = "game"


// DEBUG ORTHO CAM
const viewSize = 2.5;
const aspect = 16/9;

// 3. Create the orthographic camera
const debugCam = new THREE.OrthographicCamera(
  -aspect * viewSize / 2,  // left
   aspect * viewSize / 2,  // right
   viewSize / 2,           // top
  -viewSize / 2,           // bottom
   0.1,                    // near
   1000                    // far
);
debugCam.position.set(-8, 50/256, -8);
debugCam.lookAt(-4, 50/256, -8);
debugCam.name = "debug"
scene.add(debugCam);


//// RENDERER
const renderer = new THREE.WebGLRenderer({ antialias: true });

if (window.innerWidth > window.innerHeight){
  renderer.setSize(window.innerHeight * 16/9, window.innerHeight);
} else {
  renderer.setSize(window.innerWidth, window.innerWidth * 9/16);
}

document.body.appendChild(renderer.domElement);

//// SKY + SUN
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


//// ORBIT CONTROLS
let orbitControls = new OrbitControls(orbitCam, renderer.domElement);
// orbitControls.target.set(lookX, look_ht, lookZ);
orbitControls.enablePan = true;
orbitControls.enableRotate = true;
orbitControls.minDistance = .01;
orbitControls.maxDistance = G.OPT_SIGHT_DIST;


//// LIGHTING
const light = new THREE.DirectionalLight(0xffffff, 3.8);
light.position.set(0, 50, 50).normalize();
scene.add(light);

const ambientLight = new THREE.AmbientLight(0xfeffd9, 1.3); // color, intensity
scene.add(ambientLight);

// FOG
if (G.FOG_ACTIVE) {
  scene.fog = new THREE.Fog(0xdcf2f5, .5, 15 )
}


export { scene, orbitCam, gameCam, debugCam, renderer, orbitControls }