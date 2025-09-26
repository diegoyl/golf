// shader.js
import * as THREE from 'three';
import * as G from '../utils/globals.js';
// shader.js

import { HOLE_MANAGER } from '../managers/GameManager.js';


// world texture constants , TPS = Tiles Per Square (256 ft)
const mainTPS = 64 // putting green grid = 2 ft = 4ft tile = 256/4 
const dirtErosTPS = 5;
const grassErosTPS = 3;
const sandErosTPS = 8;

// overlay mix
const erosionMixWt = 0.04 // 0-1 low-hi




// helpers
function loadTexture(url, isMask = false) {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      tex => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.encoding = THREE.sRGBEncoding;
        

        // if (isMask) {
        //   tex.minFilter = THREE.NearestFilter;
        //   tex.magFilter = THREE.NearestFilter;
        //   tex.generateMipmaps = false;
        // }

        resolve(tex);
      },
      undefined,
      err => reject(`Failed to load texture: ${url}`)
    );
  });
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = src;
    img.onload = () => resolve(img);
  });
}

// async function getHeightMapMinMax(heightData, surfaceMaskURL) {
//   // Load both images
//   const maskImg = await loadImage(surfaceMaskURL);

//   // Setup canvases
//   const canvasMask = document.createElement('canvas');
//   canvasMask.width = maskImg.width;
//   canvasMask.height = maskImg.height;
//   const ctxMask = canvasMask.getContext('2d');
//   ctxMask.drawImage(maskImg, 0, 0);
//   const maskData = ctxMask.getImageData(0, 0, maskImg.width, maskImg.height).data;

//   let minHeat = 1.0;
//   let maxHeat = -1.0;

//   const scale = maskImg.width / heightData.width; // Should be 4
//   console.log("calc: green heatmap")
//   console.log("surfID: "+maskImg)
//   console.log("heightData: ")
//   console.log(heightData)
//   console.log("scale: mask/height = "+ scale)


//   for (let y = 0; y < heightData.height; y++) {
//     for (let x = 0; x < heightData.width; x++) {
//       const heightIndex = (y * heightData.width + x);

//       // Map to mask pixel:
//       const maskX = Math.floor(x * scale);
//       const maskY = Math.floor(y * scale);
//       const maskIndex = (maskY * maskImg.width + maskX);

//       const r = maskData[maskIndex] / 255;
//       const g = maskData[maskIndex + 1] / 255;
//       const b = maskData[maskIndex + 2] / 255;

//       // Adjust threshold as needed
//       const isGreen = (r > 0.8 && g < 0.1 && b > 0.8);
//       // const isGreen = "green" == G.getSurfaceFromColor(r, g, b);

//       if (isGreen) {
//         const heightVal = heightData.data[heightIndex];
//         if (heightVal < minHeat) minHeat = heightVal;
//         if (heightVal > maxHeat) maxHeat = heightVal;
//       }
//     }
//   }
//   minHeat *= G.WORLD_Z
//   maxHeat *= G.WORLD_Z
//   return { minHeat, maxHeat };
// }


//////////////
// SHADERS ///
//////////////

// GREEN HEAT + SURFACE TEXTURES w toggle
export async function createJointMaterial(holeName) {

const heightMapURL = `./BUMP/${holeName}_RAWBUMP.raw`;
const surfaceMaskURL = `./SURFID/${holeName}_SURFID.png`;

// get hole dimensions
const gridWH = G.HOLE_DICT[holeName]["gridWH"];
const gridXY = G.HOLE_DICT[holeName]["gridXY"];

// fixing uv aspect
const holeSqW = gridWH[0];
const holeSqH = gridWH[1];

const txtScaleX = mainTPS * holeSqW
const txtScaleY = mainTPS * holeSqH

const dirtErosScaleX = dirtErosTPS * holeSqW
const dirtErosScaleY = dirtErosTPS * holeSqH
const grassErosScaleX = grassErosTPS * holeSqW
const grassErosScaleY = grassErosTPS * holeSqH
const sandErosScaleX = sandErosTPS * holeSqW
const sandErosScaleY = sandErosTPS * holeSqH

// shadows
const avatarShadRadius = G.ftTo(1.6) / 4;
const avatarShadStrength = 0.22; // max shadow darkness (0 = full black , 1=no shadow) 
const avatarShadFeather = 0.7;

const ballShadRadius = G.inTo(2) / 4;
const ballShadStrength = 0.4; // max shadow darkness (0 = full black , 1=no shadow) 
const ballShadFeather = .7;

///// SURF TXT STUFF
  console.log("\tLoading surface mask...");
  const uSurfaceMask = await loadTexture(surfaceMaskURL, true);

  console.log("\tLoading surface textures...");
  const surfaceNames = [
    'dirt', 'ob', 'rough', 'fairway', 'green','green_edge', 'rock', 'desert', 'bunker'
  ];
  const erosionNames = [
    'dirt','grass','sand',
  ]

  const surfaceTextures = {};
  const promises = surfaceNames.map(async name => {
    surfaceTextures[name] = await loadTexture(`./textures/${name}.jpg`);
  });
  await Promise.all(promises);
  
  const erosionTextures = {};
  const erosPromises = erosionNames.map(async name => {
    erosionTextures[name] = await loadTexture(`./textures/erosion/${name}.jpg`);
  });
  await Promise.all(erosPromises);

  console.log("\tDone loading all surface textures!");


///// HEAT STUFF
  console.log("\tLoading heightmap image...");
  // Load raw image
  const heightData = await G.extractFromRaw(heightMapURL, ...gridWH)
  
  function flipHeightDataY(data, width, height) {
    const flipped = new Float32Array(data.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIndex = y * width + x;
        const dstIndex = (height - 1 - y) * width + x;
        flipped[dstIndex] = data[srcIndex];
      }
    }
    return flipped;
  }
  const flippedData = flipHeightDataY(heightData.data, heightData.width, heightData.height);

  const heightDataTexture = new THREE.DataTexture(
    flippedData,
    heightData.width,
    heightData.height,
    THREE.RedFormat,
    THREE.FloatType
  );
  heightDataTexture.needsUpdate = true;
  console.log("\tDone loading heightmap texture!");

  // get max min heights on green for heat map
  // const { minHeat, maxHeat } = await getHeightMapMinMax(heightData, surfaceMaskURL);
  const heatRange = G.HOLE_DICT[holeName]["heatRange"];
  const minHeat = heatRange[0] / 255;
  const maxHeat = heatRange[1] / 255;
  console.log(`\tHeightmap range: ${minHeat} to ${maxHeat}`);

  
  //// SHADOWS ////
  const shadowMap = new THREE.TextureLoader().load(`./SHADOW/${holeName}_SHAD.jpg`)

  const uniforms = {
    uRepeatBase: { value: new THREE.Vector2(txtScaleX, txtScaleY) },
    erosionMixWt: { value: erosionMixWt },
    uSurfaceMask: { value: uSurfaceMask },
    uAspect: { value: gridWH[0] / gridWH[1] },

    uHeightMap: { value: heightDataTexture },
    uMinHeight: { value: minHeat },
    uMaxHeight: { value: maxHeat },
    uHeatBands: { value: 22 },
    uShowHeatmap: { value: false }, // toggle on by default — can change from JS
    
    uDirtErosionRepeat: { value: new THREE.Vector2(dirtErosScaleX, dirtErosScaleY) },
    uGrassErosionRepeat: { value: new THREE.Vector2(grassErosScaleX, grassErosScaleY) },
    uSandErosionRepeat: { value: new THREE.Vector2(sandErosScaleX, sandErosScaleY) },

    /// SHADOWS
    uShadowMap: { value: shadowMap },

    uAvatarPos: { value: new THREE.Vector2(0 , 0) },
    uAvatarShadRadius: { value: avatarShadRadius },
    uAvatarShadStrength: { value: avatarShadStrength },
    uAvatarShadFeather: { value: avatarShadFeather },

    uBallPos: { value: new THREE.Vector2(0 , 0) },
    uBallShadRadius: { value: ballShadRadius },
    uBallShadStrength: { value: ballShadStrength },
    uBallShadFeather: { value: ballShadFeather },
    
    // HOLE PARAMS
    uHoleCenter: { value: new THREE.Vector2(0,0)},
    uHoleRadius: { value: G.CUP_RADIUS / holeSqH }
  };
  surfaceNames.forEach(name => {
    const uniName = `u${name.charAt(0).toUpperCase() + name.slice(1)}Tex`;
    uniforms[uniName] = { value: surfaceTextures[name] };
  });
  erosionNames.forEach(name => {
    const uniName = `u${name.charAt(0).toUpperCase() + name.slice(1)}ErosionTex`;
    uniforms[uniName] = { value: erosionTextures[name] };
  });


  const terrainMaterial = new THREE.ShaderMaterial({
    transparent: true,
    uniforms,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float erosionMixWt;
      uniform sampler2D uSurfaceMask;
      uniform float uAspect;

      uniform sampler2D uDirtTex;
      uniform sampler2D uObTex;
      uniform sampler2D uRoughTex;
      uniform sampler2D uFairwayTex;
      uniform sampler2D uGreen_edgeTex;
      uniform sampler2D uGreenTex;
      uniform sampler2D uRockTex;
      uniform sampler2D uDesertTex;
      uniform sampler2D uBunkerTex;

      uniform sampler2D uDirtErosionTex;
      uniform sampler2D uGrassErosionTex;
      uniform sampler2D uSandErosionTex;

      uniform sampler2D uShadowMap;

      uniform vec2 uRepeatBase;
      uniform vec2 uDirtErosionRepeat;
      uniform vec2 uGrassErosionRepeat;
      uniform vec2 uSandErosionRepeat;

      uniform vec2 uHoleCenter;
      uniform float uHoleRadius;

      uniform sampler2D uHeightMap;
      uniform float uMinHeight;
      uniform float uMaxHeight;
      uniform float uHeatBands;
      uniform bool uShowHeatmap;


      //// SHADOWS ////
      uniform vec2 uAvatarPos;
      uniform float uAvatarShadRadius;
      uniform float uAvatarShadStrength;
      uniform float uAvatarShadFeather;
      uniform vec2 uBallPos;
      uniform float uBallShadRadius;
      uniform float uBallShadStrength;
      uniform float uBallShadFeather;

      varying vec2 vUv;

      void main() {
        vec2 flippedUv = vec2(vUv.x, 1.0 - vUv.y);
        vec2 uvBase = flippedUv * uRepeatBase;

        vec3 maskColor = texture2D(uSurfaceMask, flippedUv).rgb;

        vec3 colorRock      = vec3(1.0, 1.0, 1.0);
        vec3 colorBunker    = vec3(1.0, 0.5, 0.0);
        vec3 colorDesert    = vec3(1.0, 1.0, 0.0);
        vec3 colorDirt      = vec3(0.0, 1.0, 0.0);
        vec3 colorOb        = vec3(0.0, 1.0, 1.0);
        vec3 colorRough     = vec3(0.0, 0.5, 1.0);
        vec3 colorFairway   = vec3(0.0, 0.0, 1.0);
        vec3 colorGreenEdge = vec3(0.5, 0.0, 1.0);
        vec3 colorGreen     = vec3(1.0, 0.0, 1.0);


        float threshold = 0.991;

        float wDirt      = 1.0 - smoothstep(0.0, threshold, distance(maskColor, colorDirt));
        float wOb        = 1.0 - smoothstep(0.0, threshold, distance(maskColor, colorOb));
        float wRough     = 1.0 - smoothstep(0.0, threshold, distance(maskColor, colorRough));
        float wFairway   = 1.0 - smoothstep(0.0, threshold, distance(maskColor, colorFairway));
        float wGreenEdge = 1.0 - smoothstep(0.0, threshold, distance(maskColor, colorGreenEdge));
        float wGreen     = 1.0 - smoothstep(0.0, threshold, distance(maskColor, colorGreen));
        float wRock      = 1.0 - smoothstep(0.0, threshold, distance(maskColor, colorRock));
        float wDesert    = 1.0 - smoothstep(0.0, threshold, distance(maskColor, colorDesert));
        float wBunker    = 1.0 - smoothstep(0.0, threshold, distance(maskColor, colorBunker));

        #define SAMPLE_SURFACE(baseTex, erosionTex, erosionRepeat) \
            mix(texture2D(baseTex, uvBase).rgb, texture2D(erosionTex, flippedUv * erosionRepeat).rgb, erosionMixWt)

        vec3 cDirt      = SAMPLE_SURFACE(uDirtTex, uDirtErosionTex, uDirtErosionRepeat);
        vec3 cOb        = SAMPLE_SURFACE(uObTex, uGrassErosionTex, uGrassErosionRepeat);
        vec3 cRough     = SAMPLE_SURFACE(uRoughTex, uGrassErosionTex, uGrassErosionRepeat);
        vec3 cFairway   = SAMPLE_SURFACE(uFairwayTex, uGrassErosionTex, uGrassErosionRepeat);
        vec3 cGreenEdge = SAMPLE_SURFACE(uGreen_edgeTex, uGrassErosionTex, uGrassErosionRepeat);
        vec3 cGreen     = SAMPLE_SURFACE(uGreenTex, uGrassErosionTex, uGrassErosionRepeat);
        vec3 cRock      = SAMPLE_SURFACE(uRockTex, uDirtTex, uDirtErosionRepeat);
        vec3 cDesert    = SAMPLE_SURFACE(uDesertTex, uSandErosionTex, uSandErosionRepeat);
        vec3 cBunker    = SAMPLE_SURFACE(uBunkerTex, uSandErosionTex, uSandErosionRepeat);

        vec3 baseColor = 
            wDirt      * cDirt +
            wOb        * cOb +
            wRough     * cRough +
            wFairway   * cFairway +
            wGreenEdge * cGreenEdge +
            wGreen     * cGreen +
            wRock      * cRock +
            wDesert    * cDesert +
            wBunker    * cBunker;

        float totalWeight = wDirt + wOb + wRough + wFairway + wGreenEdge + wGreen + wRock + wDesert + wBunker;

        if (totalWeight > 0.0) {
            baseColor /= totalWeight;
        } else {
            baseColor = vec3(0.3, 0.2, 0.1);
        }


        vec3 finalColor = baseColor;

        if (uShowHeatmap && wGreen > 0.5) {
            // --- Heatmap logic ---
            float height = texture2D(uHeightMap, flippedUv).r;
            float normalized = (height - uMinHeight) / (uMaxHeight - uMinHeight);
            normalized = clamp(normalized, 0.0, 1.0);

            // Snap to heatBands
            float snapped = floor(normalized * float(uHeatBands) + 0.5) / float(uHeatBands);

            vec3 lowColor = vec3(.9, 0.0, 0.2);
            vec3 highColor = vec3(1.0, 1.0, 0.3);
            vec3 heatColor = mix(lowColor, highColor, snapped);

            float heatW = ((wGreen - 0.5)/0.5) * 0.6 + 0.4;
            vec3 heatColorMix = mix(baseColor, heatColor, heatW);

            finalColor = heatColorMix;
        }

      // scale object positions to local coords
        vec2 adjUv = vUv;
        adjUv.x *= uAspect;
        vec2 adjHoleCenter = uHoleCenter;
        adjHoleCenter.x *= uAspect;
        vec2 adjAvatarPos = uAvatarPos;
        adjAvatarPos.x *= uAspect;
        vec2 adjBallPos = uBallPos;
        adjBallPos.x *= uAspect;
        
        // Sample and apply shadow map
        float shadow = texture2D(uShadowMap, flippedUv).r;
        finalColor *= shadow;


        if (distance(adjUv, adjHoleCenter) < uHoleRadius) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
        } 
        
        else if (distance(adjUv, adjAvatarPos) < uAvatarShadRadius) {
            float distMapped = pow(distance(adjUv, adjAvatarPos) / uAvatarShadRadius, uAvatarShadFeather);
            finalColor *= distMapped * (1.0 - uAvatarShadStrength) + uAvatarShadStrength;
            gl_FragColor = vec4(finalColor, 1.0);
        } 
        else {
            gl_FragColor = vec4(finalColor, 1.0);
        }

        // apply ball shadow on top
        if (distance(adjUv, adjBallPos) < uBallShadRadius) {
            float distMapped = pow(distance(adjUv, adjBallPos) / uBallShadRadius, uBallShadFeather);
            finalColor *= distMapped * (1.0 - uBallShadStrength) + uBallShadStrength;
            gl_FragColor = vec4(finalColor, 1.0);
        } 

      }
    `,
  });

  return terrainMaterial;
}



// ONLY SURFACE TEXTURES
// export async function createHoleMaterial(holeName) {

//   console.log("\tLoading surface mask...");
//   const uSurfaceMask = await loadTexture(`./SURFID/${holeName}_SURFID.png`, true);

//   console.log("\tLoading surface textures...");
//   const surfaceNames = [
//     'dirt', 'ob', 'rough', 'fairway', 'green','green_edge',
//     'water_edge', 'rock', 'desert', 'bunker', 'water'
//   ];
//   const erosionNames = [
//     'dirt','grass','sand',
//   ]

//   const surfaceTextures = {};
//   const promises = surfaceNames.map(async name => {
//     surfaceTextures[name] = await loadTexture(`./textures/${name}.jpg`);
//   });
//   await Promise.all(promises);
  
//   const erosionTextures = {};
//   const erosPromises = erosionNames.map(async name => {
//     erosionTextures[name] = await loadTexture(`./textures/erosion/${name}.jpg`);
//   });
//   await Promise.all(erosPromises);

//   console.log("\tDone loading all surface textures!");

//   const uniforms = {
//     uRepeatBase: { value: new THREE.Vector2(txtScaleX, txtScaleY) },
//     erosionMixWt: { value: erosionMixWt },
//     uSurfaceMask: { value: uSurfaceMask },
//     holeCenter: { value: new THREE.Vector2(HOLE_LOC.x / 100, HOLE_LOC.z / 100) },
//     holeRadius: { value: G.CUP_RADIUS / G.OPT_SIZE },
    
//     uDirtErosionRepeat: { value: new THREE.Vector2(12,12) },
//     uGrassErosionRepeat: { value: new THREE.Vector2(20,20) },
//     uSandErosionRepeat: { value: new THREE.Vector2(40,40) },
//   };

//   surfaceNames.forEach(name => {
//     const uniName = `u${name.charAt(0).toUpperCase() + name.slice(1)}Tex`;
//     uniforms[uniName] = { value: surfaceTextures[name] };
//   });
//   erosionNames.forEach(name => {
//     const uniName = `u${name.charAt(0).toUpperCase() + name.slice(1)}ErosionTex`;
//     uniforms[uniName] = { value: erosionTextures[name] };
//   });

//   const terrainMaterial = new THREE.ShaderMaterial({
//     transparent: true,
//     uniforms,
//     vertexShader: `
//       varying vec2 vUv;
//       void main() {
//         vUv = uv;
//         gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
//       }
//     `,
//     fragmentShader: `
//         uniform float erosionMixWt;
//         uniform sampler2D uSurfaceMask;

//         uniform sampler2D uDirtTex;
//         uniform sampler2D uObTex;
//         uniform sampler2D uRoughTex;
//         uniform sampler2D uFairwayTex;
//         uniform sampler2D uGreen_edgeTex;
//         uniform sampler2D uGreenTex;
//         uniform sampler2D uWater_edgeTex;
//         uniform sampler2D uRockTex;
//         uniform sampler2D uDesertTex;
//         uniform sampler2D uBunkerTex;
//         uniform sampler2D uWaterTex;

//         uniform sampler2D uDirtErosionTex;
//         uniform sampler2D uGrassErosionTex;
//         uniform sampler2D uSandErosionTex;

//         uniform vec2 uRepeatBase;
//         uniform vec2 uDirtErosionRepeat;
//         uniform vec2 uGrassErosionRepeat;
//         uniform vec2 uSandErosionRepeat;

//         varying vec2 vUv;

//         void main() {
//         vec2 flippedUv = vec2(vUv.x, 1.0 - vUv.y);
//         vec2 uvBase = flippedUv * uRepeatBase;

//         vec3 maskColor = texture2D(uSurfaceMask, flippedUv).rgb;

//         // Surface colors
//         vec3 colorDirt      = vec3(0.0, 0.0, 0.0);
//         vec3 colorOb        = vec3(1.0, 0.0, 0.0);
//         vec3 colorRough     = vec3(1.0, 0.5, 0.0);
//         vec3 colorFairway   = vec3(1.0, 1.0, 0.0);
//         vec3 colorGreenEdge = vec3(0.0, 1.0, 0.0);
//         vec3 colorGreen     = vec3(0.0, 1.0, 1.0);
//         vec3 colorWaterEdge = vec3(0.0, 0.5, 1.0);
//         vec3 colorRock      = vec3(0.0, 0.0, 1.0);
//         vec3 colorDesert    = vec3(0.5, 0.0, 1.0);
//         vec3 colorBunker    = vec3(1.0, 0.0, 1.0);
//         vec3 colorWater     = vec3(1.0, 1.0, 1.0);

//         float threshold = 0.7;

//         float wDirt      = 1.0 - smoothstep(0.0, threshold, distance(maskColor, colorDirt));
//         float wOb        = 1.0 - smoothstep(0.0, threshold, distance(maskColor, colorOb));
//         float wRough     = 1.0 - smoothstep(0.0, threshold, distance(maskColor, colorRough));
//         float wFairway   = 1.0 - smoothstep(0.0, threshold, distance(maskColor, colorFairway));
//         float wGreenEdge = 1.0 - smoothstep(0.0, threshold, distance(maskColor, colorGreenEdge));
//         float wGreen     = 1.0 - smoothstep(0.0, threshold, distance(maskColor, colorGreen));
//         float wWaterEdge = 1.0 - smoothstep(0.0, threshold, distance(maskColor, colorWaterEdge));
//         float wRock      = 1.0 - smoothstep(0.0, threshold, distance(maskColor, colorRock));
//         float wDesert    = 1.0 - smoothstep(0.0, threshold, distance(maskColor, colorDesert));
//         float wBunker    = 1.0 - smoothstep(0.0, threshold, distance(maskColor, colorBunker));
//         float wWater     = 1.0 - smoothstep(0.0, threshold, distance(maskColor, colorWater));

//         // Helper macro to sample and mix base + erosion
//         #define SAMPLE_SURFACE(baseTex, erosionTex, erosionRepeat) \
//             mix(texture2D(baseTex, uvBase).rgb, texture2D(erosionTex, flippedUv * erosionRepeat).rgb, erosionMixWt)

//         vec3 cDirt      = SAMPLE_SURFACE(uDirtTex, uDirtErosionTex, uDirtErosionRepeat);
//         vec3 cOb        = SAMPLE_SURFACE(uObTex, uGrassErosionTex, uGrassErosionRepeat);
//         vec3 cRough     = SAMPLE_SURFACE(uRoughTex, uGrassErosionTex, uGrassErosionRepeat);
//         vec3 cFairway   = SAMPLE_SURFACE(uFairwayTex, uGrassErosionTex, uGrassErosionRepeat);
//         vec3 cGreenEdge = SAMPLE_SURFACE(uGreen_edgeTex, uGrassErosionTex, uGrassErosionRepeat);
//         vec3 cGreen     = SAMPLE_SURFACE(uGreenTex, uGrassErosionTex, uGrassErosionRepeat);
//         vec3 cWaterEdge = SAMPLE_SURFACE(uWater_edgeTex, uDirtErosionTex, uDirtErosionRepeat);
//         vec3 cRock      = SAMPLE_SURFACE(uRockTex, uDirtTex, uDirtErosionRepeat);
//         vec3 cDesert    = SAMPLE_SURFACE(uDesertTex, uSandErosionTex, uSandErosionRepeat);
//         vec3 cBunker    = SAMPLE_SURFACE(uBunkerTex, uSandErosionTex, uSandErosionRepeat);
//         vec3 cWater     = SAMPLE_SURFACE(uWaterTex, uDirtErosionTex, uDirtErosionRepeat);

//         vec3 finalColor = 
//             wDirt      * cDirt +
//             wOb        * cOb +
//             wRough     * cRough +
//             wFairway   * cFairway +
//             wGreenEdge * cGreenEdge +
//             wGreen     * cGreen +
//             wWaterEdge * cWaterEdge +
//             wRock      * cRock +
//             wDesert    * cDesert +
//             wBunker    * cBunker +
//             wWater     * cWater;

//         float totalWeight = wDirt + wOb + wRough + wFairway + wGreenEdge + wGreen + 
//                             wWaterEdge + wRock + wDesert + wBunker + wWater;

//         if (totalWeight > 0.0) {
//             finalColor /= totalWeight;
//         } else {
//             finalColor = vec3(.3, .2, 0.1); // fallback color
//         }

        

//         if (distance(vUv, uHoleCenter) < uHoleRadius) {
//             gl_FragColor = vec4(0.0 , 0.0 , 0.0 , 0.0);
//         } else {
//             gl_FragColor = vec4(finalColor, 1.0);
//         }
        
//     }
//     `,
//   });

//   return terrainMaterial;
// }


