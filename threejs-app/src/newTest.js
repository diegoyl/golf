import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import './style.css';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 40, 100);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(50, 100, 50);
scene.add(light);
scene.add(new THREE.AmbientLight(0x888888));

const size = 100;
const segments = 1023;
const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
// geometry.rotateX(-Math.PI / 2); // ✅ Rotates the actual geometry buffer


// Load RAW 16-bit grayscale heightmap
fetch('bump16.raw') // Ensure this is served by your dev server
  .then(res => res.arrayBuffer())
  .then(buffer => {
    const heightArray = new Uint16Array(buffer);
    applyHeightmap(heightArray, 1024, 1024); // width and height of the RAW file
  });

  
  function applyHeightmap(data, width, height) {
  const pos = geometry.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const x = i % width;
    const y = Math.floor(i / width);

    // Get surrounding pixel values
    const get = (x, y) => data[Math.min(height - 1, Math.max(0, y)) * width + Math.min(width - 1, Math.max(0, x))] / 65535;

    const h00 = get(x, y);
    const h01 = get(x, y + 1);
    const h10 = get(x + 1, y);
    const h11 = get(x + 1, y + 1);

    const fx = (x / (width - 1)) % 1;
    const fy = (y / (height - 1)) % 1;

    // Bilinear interpolation
    const interpHeight =
      h00 * (1 - fx) * (1 - fy) +
      h10 * fx * (1 - fy) +
      h01 * (1 - fx) * fy +
      h11 * fx * fy;

    pos.setZ(i, interpHeight * 10); // Adjust vertical scale here
  }

  pos.needsUpdate = true;
  geometry.computeVertexNormals();
}

let terrain;
// Now load your mask texture and use it as the color map:
const loader = new THREE.TextureLoader();
loader.load('textures/test1.png', (maskTex) => {
  maskTex.wrapS = maskTex.wrapT = THREE.ClampToEdgeWrapping;
  maskTex.minFilter = THREE.LinearFilter;
  maskTex.magFilter = THREE.LinearFilter;

  const material = new THREE.MeshStandardMaterial({
    map: maskTex,
    flatShading: false,
  });

  terrain = new THREE.Mesh(geometry, material);
  scene.add(terrain);
});


window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
