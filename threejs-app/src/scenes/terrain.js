////////////////////////////////////////////////////////////////////////////////
// CAMERA , RENDER, LIGHT SETUP ////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
import * as G from '../utils/globals.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Box3, Vector3 } from 'three';

import { scene } from './sceneSetup.js';
import { createHoleMaterial } from '../shaders/terrainShader.js'
import { createIslandMaterial } from '../shaders/islandShader.js';

console.log("Init File: terrain.js")
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
export { loadTerrain, replaceHoleModel }

let islandModel = null;
let islandMaterial = null;
let curHoleModel = null;
let holeMaterial = null;

const ISLAND_OFFSET = G.inTo(15); // vertical gap between background island model and current hhole model

async function loadTerrain(holeName) {
    console.log("func: loadTerrain \n-------------------------")
    const fileName = G.TERRAIN_GLBS[holeName]
    
    return new Promise((resolve, reject) => {
        let lastLoggedPercent = 0;
        const loader = new GLTFLoader();
        console.log('await Promise from GLTF LOADER');

        loader.load(`./GLTF/${fileName}.glb`, 
            (gltf) => {
                let terrain = gltf.scene 
                scene.add(terrain);
                console.log(holeName+' Model loaded:', gltf);

                // GET SIZE
                const box = new Box3().setFromObject(terrain);
                const size = new Vector3();
                box.getSize(size);
                console.log(holeName+' size:', size); // size.x, size.y, size.z
                console.log(holeName+' pos:', terrain.position); // size.x, size.y, size.z

                // SCALE and SHIFTING
                // const maxDim = Math.max(size.x, size.y, size.z);
                // const scale = G.OPT_SIZE / maxDim;
                // terrain.scale.set(scale, scale, scale);
                // terrain.position.y += 0; // move it up by x units

                // ?? RAYCAST SRUFF
                // THREE.Mesh.prototype.raycast = acceleratedRaycast;
                // terrain.traverse((child) => {
                //     if (child.isMesh) {
                //         // Ensure the geometry has bounding info
                //         child.geometry.computeBoundsTree = MeshBVH.prototype.build;
                //         child.geometry.boundsTree = new MeshBVH(child.geometry); // <- This builds the BVH
                //         child.geometry.computeBoundingBox(); // good for other physics needs too
                //         child.geometry.computeBoundingSphere();
                //     }
                // });

                // resolve once loaded
                console.log("Done loading "+holeName+"!")

                // for tracking model so it can be removed
                if (holeName === "island") {
                    islandModel = terrain;
                    setupIsland(islandModel)
                    loadOcean();
                } else {
                    curHoleModel = terrain;
                    updateIslandAlphaMap(holeName);
                    // addTrees(holeName);
                }
                resolve(terrain); 
            },
            (xhr) => {
                // Log loading state
                const percent = (xhr.loaded / xhr.total) * 100;
                if (percent - lastLoggedPercent >= 25 || percent === 100) {
                    console.log(`${percent.toFixed(0)}% loaded`);
                    lastLoggedPercent = percent;
                }
            },
            (error) => {
                console.error('ERROR loading "'+holeName+'":\n', error);
                reject(error);
            }
        ); // end: loader.load('./gltf

    });
}


async function removeHole() {
    console.log("Func: removeHole")
    scene.remove(curHoleModel);

    curHoleModel.traverse((child) => {
    if (child.isMesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
        } else if (child.material) {
        child.material.dispose();
        }
    }});
}


async function replaceHoleModel(holeName) {
    console.log("Func: replaceHoleModel")
    if (curHoleModel) {
        await removeHole();
    }
    await loadTerrain(holeName);
    await addHoleMaterial(holeName);
}


export function loadOcean() {
    const oceanW = 16
    const oceanH = 20
    const geometry = new THREE.PlaneGeometry(oceanW, oceanH);

    const textureLoader = new THREE.TextureLoader();
    const alphaMap = textureLoader.load('ALPHA/ocean.jpg');

    const tileFactor = 200
    const texture = textureLoader.load('textures/ocean.jpg', (tex) => {
        // After texture loads, calculate aspect ratio
        // const planeAspect = oceanW / oceanH;

        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        const imageAspect = tex.image.width / tex.image.height;
        tex.repeat.set(imageAspect * tileFactor, tileFactor);
    })

    //   const video = document.createElement('video');
    //   video.src = '/videos/ocean_waves.mp4'; // Put this in your public folder
    //   video.loop = true;
    //   video.muted = true;
    //   video.playsInline = true; // important for mobile
    //   video.play();

    //   const videoTexture = new THREE.VideoTexture(video);


    const material = new THREE.MeshBasicMaterial({
        // color: 0x11064273,
        side: THREE.FrontSide, // only from top
        transparent: true,     // enable transparency
        alphaMap: alphaMap,
        map: texture,
    });
    material.alphaTest = 0.9;

    const ocean = new THREE.Mesh(geometry, material);

    // Rotate to lie flat
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = G.ftTo(4.8); // 5ft = set sea level

    // Disable stuff
    ocean.castShadow = false;
    ocean.receiveShadow = true;

    scene.add(ocean)

    
    

    // second
    const alphaMap2 = textureLoader.load('ALPHA/oceanDeep.jpg');

    const tileFactor2 = 50
    const texture2 = textureLoader.load('textures/oceanDeep.jpg', (tex) => {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        const imageAspect = tex.image.width / tex.image.height;
        tex.repeat.set(imageAspect * tileFactor2, tileFactor2);
    })
    const material2 = new THREE.MeshBasicMaterial({
        // color: 0x11064273, 
        side: THREE.FrontSide, // only from top
        transparent: true, // enable transparency
        alphaMap: alphaMap2,
        map: texture2,
        opacity: 0.9,
    });

    const ocean2 = new THREE.Mesh(geometry, material2);

    // Rotate to lie flat
    ocean2.rotation.x = -Math.PI / 2;
    ocean2.position.y = G.ftTo(5); // 5ft = set sea level

    // Disable stuff
    ocean2.castShadow = false;
    ocean2.receiveShadow = true;

    scene.add(ocean2)


    // infinite ocean cirlce
    const geometry3 = new THREE.CircleGeometry(50, 30);    
    const material3 = new THREE.MeshBasicMaterial({
        // color: 0x11064273, 
        side: THREE.FrontSide, // only from top
        transparent: true, // enable transparency
        map: texture2,
        opacity: 1,
    });

    const ocean3 = new THREE.Mesh(geometry3, material3);

    // Rotate to lie flat
    ocean3.rotation.x = -Math.PI / 2;
    ocean3.position.y = G.ftTo(-5); // 5ft = set sea level

    // Disable stuff
    ocean3.castShadow = false;
    ocean3.receiveShadow = false;
    scene.add(ocean3)
}


export async function addHoleMaterial(holeName, heat="false") {

    holeMaterial = await createHoleMaterial(holeName)

    curHoleModel.traverse((child) => {
        if (child.isMesh) {
        child.material = holeMaterial;
        child.material.needsUpdate = true;
        }
    })
}

export async function toggleHeat() {
    holeMaterial.uniforms.uShowHeatmap.value = !holeMaterial.uniforms.uShowHeatmap.value;  
    // Show heatmap on green 
    console.log("heatBool: "+holeMaterial.uniforms.uShowHeatmap.value)
}

export function updateShaderLoc(object, x,z) {
    if (object == "pin") {
        holeMaterial.uniforms.uHoleCenter.value = new THREE.Vector2(x,z)
    }
    else if (object == "avatar") {
        holeMaterial.uniforms.uAvatarPos.value = new THREE.Vector2(x,z)
    } 
    else if (object == "ball") {
        console.log("updating ballpos uniform")
        holeMaterial.uniforms.uBallPos.value = new THREE.Vector2(x,z)
    }
}
export function updateIslandAlphaMap(holeName) {
    console.log("updating island ALPHA")
    const alphaUrl = `./ALPHA/island/${holeName}_islandALPHA.jpg`
    const loader = new THREE.TextureLoader();
    loader.load(alphaUrl, (texture) => {
        islandMaterial.uniforms.uAlphaMap.value = texture;
        islandMaterial.uniforms.uAlphaMap.needsUpdate = true;
    });
}


async function setupIsland(mesh) {

    mesh.position.y += -ISLAND_OFFSET;
    
    islandMaterial = await createIslandMaterial()

    mesh.traverse((child) => {
        if (child.isMesh) {
            child.material = islandMaterial;
            child.material.needsUpdate = true;
        }
    })
}

async function addTrees(holeName) {
  console.log("adding trees");
  const gltfLoader = new GLTFLoader();

  function loadGLB(url) {
    return new Promise((resolve, reject) => {
      gltfLoader.load(
        url,
        (gltf) => resolve(gltf.scene),
        undefined,
        (err) => reject(err)
      );
    });
  }

  const treeParts = {}; // e.g. { pine_trunk: Mesh, pine_canopy: Mesh, ... }

  // Load all GLBs and extract their base meshes
  await Promise.all(
    G.treeTypes.flatMap((type) =>
      ['trunk', 'canopy'].map(async (part) => {
        const scene = await loadGLB(`./GLTF/TREES/${type.toUpperCase()}_${part}.glb`);

        // Find the first mesh in the scene (or traverse deeper if needed)
        let mesh;
        scene.traverse((child) => {
          if (child.isMesh && !mesh) {
            mesh = child;
          }
        });

        if (!mesh) {
          console.warn(`No mesh found in ${type}_${part}.glb`);
          return;
        }

        // Clone geometry and material for safety
        treeParts[`${type}_${part}`] = {
          geometry: mesh.geometry.clone(),
          material: mesh.material.clone(),
        };
      })
    )
  );

  // Count how many instances we need for each instanced mesh
  const counts = {}; // e.g. { pine_trunk: 10, oak_canopy: 7, ... }
  G.treeLocs.forEach((loc) => {
    ['trunk', 'canopy'].forEach((part) => {
      const key = `${loc.type}_${part}`;
      counts[key] = (counts[key] || 0) + 1;
    });
  });

  // Create InstancedMeshes
  const instancedMeshes = {}; // { pine_trunk: InstancedMesh, ... }
  Object.entries(counts).forEach(([key, count]) => {
    const { geometry, material } = treeParts[key];
    instancedMeshes[key] = new THREE.InstancedMesh(geometry, material, count);
    instancedMeshes[key].instanceMatrix.setUsage(THREE.DynamicDrawUsage); // optional if you'll modify later
    scene.add(instancedMeshes[key]);
  });

  // Set matrix for each instance
  const instanceCounters = {}; // track index per instanced mesh
  G.treeLocs.forEach((loc) => {
    ['trunk', 'canopy'].forEach((part) => {
      const key = `${loc.type}_${part}`;
      const mesh = instancedMeshes[key];
      const index = instanceCounters[key] || 0;

      const matrix = new THREE.Matrix4();
      const position = new THREE.Vector3(...loc.pos);
      const scale = new THREE.Vector3(loc.scale, loc.scale, loc.scale);
      matrix.compose(position, new THREE.Quaternion(), scale);

      mesh.setMatrixAt(index, matrix);
      instanceCounters[key] = index + 1;
    });
  });

  // Update all instance matrices
  Object.values(instancedMeshes).forEach((mesh) => mesh.instanceMatrix.needsUpdate = true);
}
