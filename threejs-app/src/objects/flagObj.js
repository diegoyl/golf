import * as G from '../utils/globals.js';
import * as THREE from 'three';
import { scene } from '../scenes/sceneSetup.js'; // use as G.varName

export async function createFlag() {
  console.log("\func: createFlag");

  const flagstickR = G.inTo(0.5)
  const flagW = G.inTo(20)
  const flagH = flagW * 14/20 // keep ratio

  const flagStickGeometry = new THREE.CylinderGeometry(flagstickR, flagstickR, G.FLAGSTICK_HT, 12);
  const flagStickMaterial = new THREE.MeshStandardMaterial({ color: 0xd14b1f });
  const flagStick = new THREE.Mesh(flagStickGeometry, flagStickMaterial);

  const flagGeometry = new THREE.PlaneGeometry(flagW, flagH);
  const flagMaterial = new THREE.MeshStandardMaterial({
    color: 0xf22b11,
    side: THREE.DoubleSide
  });
  const flag = new THREE.Mesh(flagGeometry, flagMaterial);
  
  flag.position.set(flagW/2, G.FLAGSTICK_HT/2 - flagH/2 - G.inTo(1), 0);
  // flag.rotation.y = Math.PI / 2; // Rotate to face outwards todo: rotate with wind
  flagStick.add(flag);

  const cupBaseGeometry = new THREE.CylinderGeometry(G.ftTo(.5), G.ftTo(.5), G.inTo(.1), 12);
  const cupBaseMaterial = new THREE.MeshStandardMaterial({
    color: 0x3d3d3d,
    side: THREE.DoubleSide
  });
  const cupBase = new THREE.Mesh(cupBaseGeometry, cupBaseMaterial);
  
  cupBase.position.set(0, -G.FLAGSTICK_HT/2 , 0);
  flagStick.add(cupBase);

  flagStick.position.set(0, 0 , 0); //default position
  scene.add(flagStick);
  

  return flagStick
}

