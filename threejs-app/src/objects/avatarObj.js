import * as G from '../utils/globals.js';
import { Club } from './clubObj.js'
import * as THREE from 'three';
import { scene } from '../scenes/sceneSetup.js'; // use as G.varName

export { CLUB }

const CLUB = new Club();

export async function createAvatar() {
  const avatarR = G.ftTo(1) // actual r
  const avatarHt = G.ftTo(5) // actual ht
  
  const pantsHt = .45 // ratio
  const shirtHt = .41 // ratio
  const headR = .14 // ratio

  const avatar = new THREE.Object3D();

  const pantsGeometry = new THREE.CylinderGeometry(avatarR * 0.8, avatarR * 0.6, avatarHt * pantsHt, 16);
  const pantsMaterial = new THREE.MeshStandardMaterial({ color: 0x141414 });
  const pants = new THREE.Mesh(pantsGeometry, pantsMaterial);

  const shirtGeometry = new THREE.CylinderGeometry(avatarR * 0.5, avatarR * 0.8, avatarHt * shirtHt, 16);
  const shirtMaterial = new THREE.MeshStandardMaterial({ color: 0xbf0b26 });
  const shirt = new THREE.Mesh(shirtGeometry, shirtMaterial);
  shirt.position.set(0, avatarHt * (pantsHt / 2 + shirtHt / 2), 0);
  pants.add(shirt);

  const headGeometry = new THREE.SphereGeometry(avatarHt * headR, 16, 16);
  const headMaterial = new THREE.MeshStandardMaterial({ color: 0xedb787 });
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.set(0, avatarHt * (pantsHt / 2 + shirtHt + headR / 2 + G.inTo(3)), 0);
  pants.add(head);

  await CLUB.initClubs();
  pants.add(CLUB.model);

  // Move pants up so that bottom is at y = 0
  pants.position.y = avatarHt * pantsHt / 2;

  avatar.add(pants);
  scene.add(avatar);

  console.log("returning avatar");
  return avatar;
}


