// shader.js
import * as THREE from 'three';
import * as G from '../utils/globals.js';
// shader.js

// world texture constants , TPS = Tiles Per Square (256 ft)
const mainTPS = 64 // putting green grid = 2 ft = 4ft tile = 256/4 

// helpers
function loadTexture(url, isMask = false) {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      tex => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.encoding = THREE.sRGBEncoding;
        

        resolve(tex);
      },
      undefined,
      err => reject(`Failed to load texture: ${url}`)
    );
  });
}



//////////////
// SHADERS ///
//////////////

// GREEN HEAT + SURFACE TEXTURES w toggle
export async function createIslandMaterial() {

const surfaceMaskURL = `./SURFID/island_SURFID.png`;

// fixing uv aspect
const holeSqW = 16;
const holeSqH = 20;

const txtScaleX = mainTPS * holeSqW
const txtScaleY = mainTPS * holeSqH


///// SURF TXT STUFF
  console.log("\tLoading surface mask...");
  const uSurfaceMask = await loadTexture(surfaceMaskURL, true);

  console.log("\tLoading surface textures...");
  const surfaceNames = [
    'dirt', 'ob', 'rough', 'fairway', 'green','green_edge', 'rock', 'desert', 'bunker'
  ];

  const surfaceTextures = {};
  const promises = surfaceNames.map(async name => {
    surfaceTextures[name] = await loadTexture(`./textures/${name}.jpg`);
  });
  await Promise.all(promises);
  

  //// SHADOWS ////
  const shadowMap = new THREE.TextureLoader().load(`./SHADOW/island_SHAD.jpg`)

  const uniforms = {
    uAlphaMap: { value: null }, // hole area discard, gets updated when setting up hole

    uRepeatBase: { value: new THREE.Vector2(txtScaleX, txtScaleY) },
    uSurfaceMask: { value: uSurfaceMask },
    uAspect: { value: holeSqH[0] / holeSqW[1] },
    uShadowMap: { value: shadowMap },

    
    fogColor: { value: new THREE.Color(0xf0fdff) },
    fogNear: { value: 0 },
    fogFar: { value: 1 },
    fogActive: { value: G.FOG_ACTIVE}
    
  };

  surfaceNames.forEach(name => {
    const uniName = `u${name.charAt(0).toUpperCase() + name.slice(1)}Tex`;
    uniforms[uniName] = { value: surfaceTextures[name] };
  });


  
  const terrainMaterial = new THREE.ShaderMaterial({
    transparent: true, // todo:implement hiding current hole on island
    uniforms,
    fog: G.FOG_ACTIVE, // optional if you're not using built-in fog chunks
    vertexShader: `
      varying vec2 vUv;
      varying float vFogDepth;
      void main() {
        vUv = uv;
        
        // Use view-space position for proper camera-relative fog depth
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vFogDepth = length(mvPosition.xyz);

        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D uSurfaceMask;
      uniform float uAspect;
      uniform vec2 uRepeatBase;

      uniform sampler2D uShadowMap;
      uniform sampler2D uAlphaMap;

      uniform sampler2D uDirtTex;
      uniform sampler2D uObTex;
      uniform sampler2D uRoughTex;
      uniform sampler2D uFairwayTex;
      uniform sampler2D uGreen_edgeTex;
      uniform sampler2D uGreenTex;
      uniform sampler2D uRockTex;
      uniform sampler2D uDesertTex;
      uniform sampler2D uBunkerTex;

      varying vec2 vUv;

      uniform vec3 fogColor;
      uniform float fogNear;
      uniform float fogFar;
      varying float vFogDepth;
      uniform bool fogActive;

      void main() {
        vec2 flippedUv = vec2(vUv.x, 1.0 - vUv.y);



        float alpha = texture2D(uAlphaMap, flippedUv).r;
        if (alpha < 0.1) discard;
        

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


        vec3 cDirt      = texture2D(uDirtTex, uvBase).rgb;
        vec3 cOb        = texture2D(uObTex, uvBase).rgb;
        vec3 cRough     = texture2D(uRoughTex, uvBase).rgb;
        vec3 cFairway   = texture2D(uFairwayTex, uvBase).rgb;
        vec3 cGreenEdge = texture2D(uGreen_edgeTex, uvBase).rgb;
        vec3 cGreen     = texture2D(uGreenTex, uvBase).rgb;
        vec3 cRock      = texture2D(uRockTex, uvBase).rgb;
        vec3 cDesert    = texture2D(uDesertTex, uvBase).rgb;
        vec3 cBunker    = texture2D(uBunkerTex, uvBase).rgb;

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
        
        // Sample and apply shadow map
        float shadow = texture2D(uShadowMap, flippedUv).r;
        finalColor *= shadow;

        if (fogActive) {
          float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
          gl_FragColor = vec4(mix(finalColor, fogColor, fogFactor), 1.0);
        }
        
        // gl_FragColor = vec4(finalColor, 1.0);

      }
    `,
  });

  return terrainMaterial;
}

