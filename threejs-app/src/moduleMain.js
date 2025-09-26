import './style.css';

// IMPORTS
import * as THREE from 'three';
import Stats from 'stats.js';
const stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom);

const infoDiv = document.createElement('div');
infoDiv.style.position = 'absolute';
infoDiv.style.top = '0px';
infoDiv.style.left = '80px';
infoDiv.style.color = '#fff';
infoDiv.style.fontFamily = 'monospace';
infoDiv.style.background = 'rgba(0,0,0,0.5)';
infoDiv.style.padding = '5px';
document.body.appendChild(infoDiv);


import { TextureLoader, PlaneGeometry, MeshPhongMaterial, Mesh } from 'three';

// GLOBALS
import * as G from './utils/globals.js'; // use as G.varName
// Module Imports
import { scene, orbitCam, gameCam, debugCam, renderer, orbitControls } from './scenes/sceneSetup.js'; // use as G.varName
import { GameManager, HOLE_MANAGER } from './managers/GameManager.js';
import { CAM_MANAGER } from './managers/CamManager.js';
import { Controller } from './input/Controller.js';

// NOTES
    // 1unit = 6in or 0.5ft
    // 1ft = 2unit
    // 1yd = 6unit

console.log("Init File: moduleMain.js")

// debugging
let ACTIVE_CAM = gameCam;
let usingOrbit = false;
let usingDebug = false;
if (usingDebug) {
  // ACTIVE_CAM = debugCam
}
// Local vars
let GAME_MANAGER;
let CONTROLLER;

function animate() {
  stats.begin();

  
  if (GAME_MANAGER.ballInMotion) {
    GAME_MANAGER.HMupdateBall(); // animate ball movement
  }
  if (CAM_MANAGER.active && !usingDebug) {
    CAM_MANAGER.update(); // animate camera movement
  }

    



 // Update renderer info
  const info = renderer.info;
  infoDiv.innerHTML = `
    <strong>Draw calls:</strong> ${info.render.calls}<br>
    <strong>Triangles:</strong> ${info.render.triangles}<br>
    <strong>Textures:</strong> ${info.memory.textures}<br>
  `;
  if (usingOrbit) {
    orbitControls.update();
  }
  renderer.render(scene, ACTIVE_CAM);

  stats.end();

  requestAnimationFrame(animate);
}


document.getElementById('startGame').addEventListener('click', () => {
  console.log("__________________")
  console.log("STARTING GAME")
  document.getElementById("gameMenu").classList.add("hide")

  startFunc();
});


async function startFunc() {
    CAM_MANAGER.cam = ACTIVE_CAM

    GAME_MANAGER = new GameManager() // courses = ?
    CONTROLLER = new Controller(GAME_MANAGER)
    await GAME_MANAGER.loadIsland()
    await GAME_MANAGER.createGameAssets()
    await GAME_MANAGER.loadHole()

    // setCameraView()

    // await createDebugSpheres()
    // async function createDebugSpheres(){
    //   const gridSize = 80;     // Number of markers per row/column
    //   const markerSize = 0.004;  // Size of each marker sphere

    //   for (let i = 0; i <= gridSize; i++) {
    //     for (let j = 0; j <= gridSize; j++) {
    //       // Compute X, Z world positions
    //       const x = i/gridSize * 2;
    //       const z = j/gridSize * 4;

    //       const xOffset = HOLE_MANAGER.gridXY[0] 
    //       const zOffset = HOLE_MANAGER.gridXY[1] 

    //       // Sample normalized height at this position
    //       const y = G.getHeightAt(x+xOffset,z+zOffset, HOLE_MANAGER.gridXY, HOLE_MANAGER.gridWH, HOLE_MANAGER.heightData)

    //       // Create marker
    //       const geometry = new THREE.SphereGeometry(markerSize, 8, 8);
    //       const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    //       const marker = new THREE.Mesh(geometry, material);

    //       marker.position.set(x+xOffset,y,z+zOffset);
    //       scene.add(marker);
    //     }
    //   }

    // }

    animate(); // todo: move to startGame 


}


/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////
///// DEBUG FUNCS ////////
/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////

document.getElementById('fov').addEventListener('input', () => {
    ACTIVE_CAM.fov = parseFloat(document.getElementById('fov').value);
    ACTIVE_CAM.updateProjectionMatrix() 
});
document.getElementById('camDist').addEventListener('input', () => {
    CAM_MANAGER.updateCamDist(parseFloat(document.getElementById('camDist').value))
});
document.getElementById('camHt').addEventListener('input', () => {
    CAM_MANAGER.updateCamHt(parseFloat(document.getElementById('camHt').value))
});
document.getElementById('lookHt').addEventListener('input', () => {
    CAM_MANAGER.updateLookHt(parseFloat(document.getElementById('lookHt').value))
});



document.getElementById('changeTee').addEventListener('click', () => {
    GAME_MANAGER.changeTee(parseInt(document.getElementById('changeTeeIdx').value))
});



function setCameraView() {
  ACTIVE_CAM.position.set(2.8,1.5,1);
//   ACTIVE_CAM.lookAt(3,0,3);
  
  orbitControls.target.set(2.5,0,0);
  orbitControls.update();
}



window.addEventListener('keydown', (event) => {
  if (
      event.key === 'c'  ||
      event.key === 'd' ||
      event.key === 'x' 
  ) {
      event.preventDefault();
  }
  if (event.key === 'c') {
      toggleCam();
  } else if (event.key === 'd') {
      toggleDebugCam();
  } else if (event.key === 'x') {
      GAME_MANAGER.changeTee(parseInt(document.getElementById('changeTeeIdx').value))
  } 
})


function toggleCam(bypass=false) {
  if (!bypass) {
    usingOrbit = !usingOrbit;
  }

  if (usingOrbit) {
    orbitControls.enabled = true;
    orbitCam.position.copy(gameCam.position);
    orbitCam.rotation.copy(gameCam.rotation);
    ACTIVE_CAM = orbitCam;
  } else {
    orbitControls.enabled = false;
    ACTIVE_CAM = gameCam;
  }
  CAM_MANAGER.cam = ACTIVE_CAM
}
function toggleDebugCam() {
  usingDebug = !usingDebug;

  if (usingDebug) {
    ACTIVE_CAM = debugCam;
  } else {
    toggleCam(true)
  }
  CAM_MANAGER.cam = ACTIVE_CAM

}


function goToHole(holeName) {
  GAME_MANAGER.loadHole(holeName,true)
}
window.goToHole = goToHole;