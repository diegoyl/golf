import * as THREE from 'three';

const HOLE_NAME = "test"


const WIDTH = 2048;
const HEIGHT = 2048;
const FILE_BUMP = `bump_${HOLE_NAME}.raw`
const OPT_SIZE = 2048;
const OPT_RES = 2048;
const OPT_BUMPHEIGHT = 200;

// === Scene Setup ===
const scene = new THREE.Scene();

const camSize = OPT_SIZE / 2 ;
const camera = new THREE.OrthographicCamera(
  -camSize, camSize,
  camSize, -camSize,
  0.1, OPT_SIZE*2
);
camera.position.set(0, OPT_SIZE, 0); // Top-down
camera.lookAt(0, 0, 0);

// === Renderer ===
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(WIDTH, HEIGHT);
document.body.appendChild(renderer.domElement);
renderer.shadowMap.enabled = true;
// renderer.shadowMap.type = THREE.PCFSoftShadowMap; // optional, higher quality


const light = new THREE.DirectionalLight(0xffffff, 10);
light.position.set(-OPT_SIZE*.4, OPT_SIZE*.5 , OPT_SIZE); // Angled light
light.castShadow = true;
light.shadow.mapSize.width = 2048;
light.shadow.mapSize.height = 2048;
light.shadow.camera.near = 0.1;
light.shadow.camera.far = OPT_SIZE * 3;
light.shadow.camera.left = -OPT_SIZE / 2;
light.shadow.camera.right = OPT_SIZE / 2;
light.shadow.camera.top = OPT_SIZE / 2;
light.shadow.camera.bottom = -OPT_SIZE / 2;
scene.add(light);
light.target.position.set(0, 0, 0);
scene.add(light.target);

// === Utility: Load Heightmap and Build Terrain ===
async function createTerrain() {
  const res = await fetch(`/bump_maps/${FILE_BUMP}`);
  const buffer = await res.arrayBuffer();
  const heightData = new Uint16Array(buffer);

  const expectedVertexCount = OPT_RES * OPT_RES;
  if (heightData.length !== expectedVertexCount) {
    console.error(`Expected ${expectedVertexCount} heights, got ${heightData.length}`);
    return;
  }

  const geometry = new THREE.PlaneGeometry(OPT_SIZE, OPT_SIZE, OPT_RES - 1, OPT_RES - 1);
  geometry.rotateX(-Math.PI / 2);

  const vertices = geometry.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const normalized = heightData[i] / 65535;
    const elevation = normalized * OPT_BUMPHEIGHT;
    vertices.setY(i, elevation);
  }
  vertices.needsUpdate = true;
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: 0x808080,
    roughness: 1.0,
    metalness: 0.0
  })

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.castShadow = false; // Optional, true if you want elevated parts to cast shadows
   
  scene.add(mesh);

  return mesh;
}

// === Screenshot Function ===
function takeScreenshot() {
  const renderTarget = new THREE.WebGLRenderTarget(WIDTH, HEIGHT);
  renderer.setRenderTarget(renderTarget);
  renderer.render(scene, camera);

  const pixels = new Uint8Array(4 * WIDTH * HEIGHT);
  renderer.readRenderTargetPixels(renderTarget, 0, 0, WIDTH, HEIGHT, pixels);

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(WIDTH, HEIGHT);

  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const i = (y * WIDTH + x) * 4;
      const flippedI = ((HEIGHT - y - 1) * WIDTH + x) * 4;
      imageData.data[i] = pixels[flippedI];
      imageData.data[i + 1] = pixels[flippedI + 1];
      imageData.data[i + 2] = pixels[flippedI + 2];
      imageData.data[i + 3] = pixels[flippedI + 3];
    }
  }

  ctx.putImageData(imageData, 0, 0);
  
  const link = document.createElement('a');
  link.download = `baked_shad_${HOLE_NAME}.png`;
  link.href = canvas.toDataURL();
  link.click();
}

// === Main ===
async function init() {
  await createTerrain();
  renderer.render(scene, camera);
  setTimeout(takeScreenshot, 1000);
}
init();
