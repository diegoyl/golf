



const HOLE_NAME = "aug12"


// OPTIONS ///////////////////////////////
let ball = false;
let aimTools = false;
let curFrame = 0


window.setCameraView = function(viewName) {

  CAMERA.position.set(0 , 0, 800);
  CAMERA.lookAt(0, 0, 0);
  
  controls.target.set(0, 0, 0);
  controls.update();
}


  







/////////////////////////////////////////////////////////////////////////////////////////
////////  ADD TERRAIN  + TEXTURES  //////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////


const raycaster = new THREE.Raycaster();
const downVector = new THREE.Vector3(0, -1, 0);
const rayOrigin = new THREE.Vector3();
function getHeightAt(x, z) {

  rayOrigin.set(x,500, z); // start high above the terrain
  raycaster.set(rayOrigin, downVector);

  const intersects = raycaster.intersectObject(terrainMesh, true);

  if (intersects.length > 0) {
    return intersects[0].point.y;
  } else {
    console.log("raytrace out of bounds")
    return 0; // or some fallback like sea level
  }


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
surfaceMapImg.src = `./surface_maps/surface_map_${HOLE_NAME}.png`;

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
    uBakedShadowTex: { value: await loadTexture('./shadow_maps/baked_shad_'+HOLE_NAME+'.png') },
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
    const maskURL = `./surface_masks/${maskName}_${HOLE_NAME}.png`;
    promises.push(
      loadTexture(maskURL, false).then(tex => {
        uniforms[maskUniformName] = { value: tex };
      })
    );

    for (const [channel, surface] of Object.entries(channels)) {
      const texUniformName = `u${surface.charAt(0).toUpperCase() + surface.slice(1)}Tex`;
      const texURL = `./textures/${surface}.jpg`;
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
    vec2 flippedUv = vec2(vUv.x, 1.0 - vUv.y);

vec2 uvTiled1 = flippedUv * uRepeat;
vec2 uvTiled2 = flippedUv * uRepeat2;

vec4 m1 = texture2D(uMask1, flippedUv);
vec4 m2 = texture2D(uMask2, flippedUv);
vec4 m3 = texture2D(uMask3, flippedUv);
vec4 m4 = texture2D(uMask4, flippedUv);

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


      // float shadow = texture2D(uBakedShadowTex, flippedUv).g * 1.8 ;
      // color = mix(color, color * shadow, 0.7);

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
  

  if (OPT_ORBIT) {
    controls.update();
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

  

  const loader = new GLTFLoader();
  const clubNames = Object.keys(CLUB_PROFILES);

  
  // Create an array of promises for loading all clubs
  const loadClubModels = clubNames.map(name => {
    return new Promise((resolve, reject) => {
      loader.load(
        `./GLTF/CLUBS/club_${name}.glb`,
        (gltf) => {
          const box = new Box3().setFromObject(gltf.scene);
          const size = new Vector3();
          box.getSize(size);
          console.log('...LOADING CLUB: '+name); // size.x, size.y, size.z

          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 6.5 / maxDim;

          // CLUB SCALE CLUB ROTATION
          gltf.scene.scale.set(scale, scale, scale);
          gltf.scene.rotateX(-Math.PI)
          gltf.scene.rotateY(-Math.PI)
          gltf.scene.rotateZ(Math.PI/4 * .85)
          CLUB_PROFILES[name]["model"] = gltf.scene; // or adjust if needed
            
          resolve();
        },
        undefined,
        (error) => {
          console.error(`Error loading club ${name}:`, error);
          reject(error);
        }
      );
    });
    console.log("ALL CLUB GLTFs loaded: ")
    console.log(CLUB_PROFILES)
  });

  // Wait for all models to load
  Promise.all(loadClubModels).then(() => {
    // Now all models are loaded and stored
    console.log("CLUB PROMISE RETURNED, setting to default driver")
    // clubMesh = CLUB_PROFILES['driver']['model'].clone(); // start with a default
    
    // // CLUB POSITIONING
    // clubMesh.position.set(2.6,4.7,.9)
    // pants.add(clubMesh);
    
    // You can now safely use `clubMesh`, switch clubs, etc.
  }).catch(error => {
    console.error("Failed to load one or more club models:", error);
  });

  pants.position.set(0,pantsHt*avatarHt,0)
  scene.add(pants);

  console.log("retunring avatar")
  return pants;

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


function createCup(holeRadius = CUP_RADIUS) {
  console.log("5. Building Cup Mesh");

  const segments = 32;
  const wallRadius = holeRadius;
  const cupHeight = CUP_DIG;

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
    roughness: 0.3,  
    side: THREE.BackSide  
  });
  const cupMesh = new THREE.Mesh(cupGeometry, cupMaterial);


  cupMesh.position.set(0, 10, 0); // default meaningless position
  scene.add(cupMesh);

  return cupMesh;
}


const yCamOffset = 13 //13 default 
const yLookOffset = 5;
const cameraDistance = 50;





const distFromBall = 6.5




function getPinPos() {
return new THREE.Vector3(pinPos.x,pinPos.y,pinPos.z)
}
let pinPos = {x:0,y:0,z:0}
function setupHole() {
    console.log("HoleManager is setting up Hole")
    // GET PIN + UPDATE CUP/FLAG Objects
    const pins = HOLE_DICT[HOLE_NAME]["pins"]
    const randomPin = pins[ Math.floor( Math.random() * pins.length ) ] // select random pin
    console.log("pins chosen:")
    console.log(randomPin)
    const pinXnorm = randomPin[0]
    const pinZnorm = randomPin[1]
    const pinX = (pinXnorm - 50 )/100 * OPT_SIZE
    const pinZ = (-pinZnorm + 50 )/100 * OPT_SIZE
    const pinY = getHeightAt(pinX,pinZ)
    pinPos.x = pinX
    pinPos.y = pinY
    pinPos.z = pinZ

    console.log("Telling pin to be moved to ")
    console.log("\t"+pinX)
    console.log("\t"+pinY)
    console.log("\t"+pinZ)
    GAME_MANAGER.setPinLocation(pinPos.x,pinPos.y,pinPos.z)

    // TEE POS
    console.log("Getting tee pos:")
    const teeXnorm = HOLE_DICT[HOLE_NAME]["tee"][0]
    const teeZnorm = HOLE_DICT[HOLE_NAME]["tee"][1]
    const teeX = (teeXnorm - 50 )/100 * OPT_SIZE
    const teeZ = (-teeZnorm + 50 )/100 * OPT_SIZE

    // NEW BALL
    ball.teeUp(teeX,teeZ)
}
  
function ballToPinDirection() {
    const ballPos = new THREE.Vector3(ball.position.x, 0, ball.position.z);
    const holePos = new THREE.Vector3(pinPos.x, 0, pinPos.z);
    
    // Direction from hole to ball
    const direction = new THREE.Vector3().subVectors(ballPos, holePos).normalize();

    console.log("Getting Ball-Pin direction:")
    console.log(direction)
    
    return direction
}

document.getElementById('fov').addEventListener('input', () => {
    const fov = parseFloat(document.getElementById('fov').value);
    CAMERA.fov = fov
    CAMERA.updateProjectionMatrix() 

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

////// ACTION ///////
let terrainMesh;
let heightData;
// await makeTerrainMesh() // MAKES TERRAIN, CUTS HOLE, AND MAKES FLAG

// addBall(15,22)


document.getElementById('startGame').addEventListener('click', () => {
  console.log("__________________")
  console.log("STARTING GAME")
  document.getElementById("gameMenu").classList.add("hide")
  loadTerrain();
  animate(); // todo: move to startGame 
});
document.getElementById('restartGame').addEventListener('click', () => {
  console.log("__________________")
  console.log("RESTARTING HOLE")


});
let startDropTime = 0


