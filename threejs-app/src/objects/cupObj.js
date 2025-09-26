import * as G from '../utils/globals.js';
import * as THREE from 'three';
import { scene } from '../scenes/sceneSetup.js'; // use as G.varName


export async function createCup(holeRadius = G.CUP_RADIUS) {
  console.log("func: createCup");

  const segments = 32;
  const wallRadius = holeRadius * 1.03; // slighly bigger than hole cutout to prevent "light" seeping in at edges
  const cupHeight = G.CUP_DIG;

  // Bottom section (white) — 0.8 * total height
  const cupGeometry = new THREE.CylinderGeometry(wallRadius, wallRadius, cupHeight, segments, 1, true);
  
  const textureLoader = new THREE.TextureLoader();
  const cupTexture = textureLoader.load('./textures/cup_texture.jpg');
  cupTexture.wrapS = THREE.RepeatWrapping;
  cupTexture.wrapT = THREE.ClampToEdgeWrapping;
  cupTexture.repeat.set(1, 1); // Stretch horizontally
  
  const cupMaterial = new THREE.MeshStandardMaterial({ 
    map: cupTexture,
    metalness: 0.3, 
    roughness: 0.2,  
    side: THREE.BackSide  
  });
  const cupMesh = new THREE.Mesh(cupGeometry, cupMaterial);

  cupMesh.position.set(0, 0, 0); // default meaningless position
  scene.add(cupMesh);


  return cupMesh;

  // Create a large cylinder that intersects the terrain
  // const testMaskGeometry = new THREE.CylinderGeometry(.03, .03, 1, 64); // radius = 2, height = 5
  // const testMaskMaterial = new THREE.MeshBasicMaterial({
  //   colorWrite: false,   // Don’t render color
  //   depthWrite: true,    // Still affect the depth buffer
  //   depthTest: true,
  //   transparent: true,
  //   opacity: 0.0         // Just to be safe
  // });
  // const testMaskMaterial2 = new THREE.MeshBasicMaterial({
  //   opacity: 1.0,
  //   color: 0xff0000          // Just to be safe
  // });
  // const maskMesh = new THREE.Mesh(testMaskGeometry, testMaskMaterial);

  // // Position it so it intersects the terrain
  // maskMesh.position.set(5.24, 0, 3.36); // Adjust Y so it slightly cuts into terrain
  // scene.add(maskMesh);
  // return cupMesh;

}

