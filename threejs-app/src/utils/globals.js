// === Conversions ===
  // unitTo() converts unit to blender units (16x20 island) 
const INCH_TO_UNIT = 3072; // 3072 in = 256 ft = 1 grid square = 1 unit
export function inTo(inch) {
  return inch / INCH_TO_UNIT
}
export function ftTo(ft) {
  return inTo( ft * 12 )
}
export function ydTo(yd) {
  return ftTo( yd * 3 )
}


export function uToYd(units) {
  return uToFt(units) / 3
}
export function uToFt(units) {
  return uToIn(units) / 12
}
export function uToIn(units) {
  return units * INCH_TO_UNIT
}

export const FOG_ACTIVE = false;


// === Cup & ball specs ===
export const CUP_RADIUS = inTo(2.4); // 4.25 real
export const CUP_DIG = inTo(6);
export const BALL_RADIUS = inTo( 1.2 * ( 1.68 / 2 )); // 1.68 real diameter
export const FLAGSTICK_HT = ftTo(9); // 9 - .5 dig

// OPTIONS
export const OPT_ORBIT = true;
export const OPT_SIZE = 2048;
export const OPT_SIGHT_DIST = OPT_SIZE * 1.2;

// PHYSICS AND SETUP
export const WORLD_Z = 0.390625 // 100/256
export const GND_SPIN_CONST = 0.26 ;
export const DEFAULT_CAM_FOV = 33


//// GLB 3D FILES
export const TERRAIN_GLBS = {
    island: "island_v2_16k",
    putt: "putt_20k",
    drive: "drive_20k",

    // blu1: "blu1_40k_unsubdec",
    blu1: "blu1_36k_DT",
    blu2: "blu2_24k",
    blu3: "",
    blu4: "",
    blu5: "",
    blu6: "",
    blu7: "",
    blu8: "",
    blu9: "blu9_50k_DT",

    grn1: "",
    grn2: "",
    grn3: "",
    grn4: "",
    grn5: "",
    grn6: "",
    grn7: "",
    grn8: "",
    grn9: "",

    red1: "",
    red2: "",
    red3: "",
    red4: "",
    red5: "",
    red6: "",
    red7: "",
    red8: "",
    red9: "",
}

export const treeTypes = ["oak", "pine"];
export const treeLocs = [
  { pos: [3, .05, 0], scale: 1.2, type: "oak" },
  { pos: [3.5, .05, 0], scale: 1, type: "oak" },
  { pos: [3, .052, .5], scale: 0.5, type: "oak" },
  { pos: [3, .05, 1], scale: 1.2, type: "pine" },
  { pos: [3.5, .05, 2], scale: 1, type: "pine" },
  { pos: [3, .052, 1.5], scale: 0.5, type: "pine" },
  // etc...
];


///////////////////////////////////////////////////////////////////////////////////////////////////
///////// FOR SURE USED ////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////



// === Gameplay & ball control variables ===
export let SWING_POWER = 1;
export let SWING_SPIN = 0;
export let AIM_ANGLE = 0;
export let BASE_AIM_ANGLE = 0;

// === Options & flags ===
export const FAST_TXT = false;

export const OPT_VIEW = "teeSide";
export const OPT_RES = 2048;


// === Camera settings ===
export const view_ht = 65;
export const look_ht = 57.5;
export const views = {
  isoTee: [25, 0, 45, 15],
  tee1: [45, 0, 45, 80],
  teeSide: [0, 20, 99, 20],
  tee2: [54, 0, 54, 80],
  tee3: [63.2, 0, 63.2, 80],
  tee4: [72.5, 0, 72.5, 80],
  tee5: [82, 0, 82, 80],
  puttFr: [15.5, 12, 15.5, 26],
  puttBk: [15.5, 28, 15.5, 19],
  puttL: [11, 22, 21, 22],
  puttR: [20, 22, 10, 22],
};

// === Movement constants ===
export const rotateSpeed = 0.03;
export const baseSpeed = 1;
export const sprintMultiplier = 10;
export const eyeLevel = 5.7 * 2;

// === Key states ===
export const keyState = {};

// Listen for keys globally (you can also move these into a separate controls module if you prefer)
window.addEventListener("keydown", (e) => {
  keyState[e.key.toLowerCase()] = true;
});
window.addEventListener("keyup", (e) => {
  keyState[e.key.toLowerCase()] = false;
});


// === Surface profiles ===
export let SURFACE_PROFILES = {
  ob:     { friction: 0.65, bounceDecay: 0.08, rollResistance: 0.90, ballRaise: -BALL_RADIUS * 1.4 },
  dirt:       { friction: 0.85, bounceDecay: 0.06, rollResistance: 0.40, ballRaise: -BALL_RADIUS * 0.8 },
  rough:      { friction: 0.88, bounceDecay: 0.12, rollResistance: 0.80, ballRaise: -BALL_RADIUS * 0.6 },
  fairway:    { friction: 0.97, bounceDecay: 0.20, rollResistance: 0.20, ballRaise: BALL_RADIUS / 15 },
  teebox:     { friction: 0.97, bounceDecay: 0.20, rollResistance: 0.20, ballRaise: BALL_RADIUS * 3 },
  green:      { friction: 0.985, bounceDecay: 0.22, rollResistance: 0.10, ballRaise: BALL_RADIUS / 10 },
  green_edge: { friction: 0.979, bounceDecay: 0.21, rollResistance: 0.15, ballRaise: BALL_RADIUS / 10 },
  bunker:     { friction: 0.7, bounceDecay: 0.04, rollResistance: 0.90, ballRaise: -BALL_RADIUS * 1.1 },
  water:      { friction: 0.01, bounceDecay: 0.01, rollResistance: 0.90, ballRaise: -BALL_RADIUS * 3 },
  water_edge: { friction: 0.99, bounceDecay: 0.50, rollResistance: 0.10, ballRaise: BALL_RADIUS / 10 },
};


// === Hole dictionary ===
export const HOLE_DICT = {
  // holeName: { heatRange: [255,255] (rgb ht value /255), gridXY:[2,-1] to topleft corner of hole, gridWH:[2,5], par: 4, tees: [[3.5,2.8], [3.5,2.8], [3.57,3.17]], pins: [[2.69,-0.17], [2.54,-0.50], [2.74,-0.21], [2.60,-0.51], [2.64,-0.36]] },
  putt: { heatRange: [48,54], gridXY:[-8,-10], gridWH:[2,4], par: 10, 
    tees: [
      [-7.7265625,-6.287109375], [-7.0078125,-6.287109375], [-6.099609375,-6.287109375], 
      [-7.017578125,-7.458984375], [-7.486328125,-8.279296875], 
    ],
    pins: [
      [-7.0078125,-8.845703125], 
      [-7.095703125,-9.400390625], 
      [-6.75,-9.390625] ]  
  },
  drive: { heatRange: [48,60], gridXY:[-6,-10], gridWH:[4,4], par: 10, 
    tees: [
      [-5.875,-6.287109375], [-5.72981770833333,-6.287109375], [-5.58463541666667,-6.287109375], 
      [-5.439453125,-6.287109375], [-5.28515625,-6.287109375], [-5.14778645833333,-6.287109375], 
      [-5.01041666666667,-6.287109375], [-4.873046875,-6.287109375], [-4.626953125,-6.287109375], 
      [-4.232421875,-6.287109375], [-4.130859375,-6.287109375], [-4.0517578125,-6.287109375], [-3.97265625,-6.287109375], 
      [-3.8935546875,-6.287109375], [-3.814453125,-6.287109375], [-3.453125,-6.287109375], [-3.046875,-6.287109375],
       [-2.638671875,-6.287109375], [-2.224609375,-6.287109375], 
    ],
    pins: [
      [-3.01, -100.01],
    ]},
  
  
  blu1: { heatRange: [34,40.2], gridXY:[2,-1], gridWH:[2,5], par: 4, 
    tees: [
      [3.51757, 2.818359],
      [3.517578, 2.818359],
      [3.578125, 3.177734]
    ],
    pins: [
      [2.699219, -0.177734],
      [2.541016, -0.503906],
      [2.748047, -0.21875],
      [2.603516, -0.511719],
      [2.646484, -0.363281]
    ]},
    // tees: [[3.517578125,2.818359375], [3.517578125,2.818359375], [3.578125,3.177734375]], 
    // pins: [[2.69921875,-0.177734375], [2.541015625,-0.50390625], [2.748046875,-0.21875], [2.603515625,-0.51171875], [2.646484375,-0.36328125]] },
  blu9: { heatRange: [66.6,79], gridXY:[4,-3], gridWH:[2,7], par: 5, 
    // tees: [[5.123046875,-1.8828125], [5.416015625,-2.34375], [5.78515625,-2.56640625], ], 
    // pins: [[5.326171875,3.4375], [5.16015625,3.32421875], [5.197265625,3.423828125], [5.318359375,3.33984375], [5.26953125,3.294921875] ] },
    tees: [
      [5.12305 , -1.882821 ],
      [5.41603 , -2.34375 ],
      [5.78516 , -2.566413 ]
    ],
    pins: [
      [5.2 , 3.43 ],
      // [5.32617 , 3.437494 ],
      // [5.16016 , 3.32422 ],
      // [5.19727 , 3.42383 ],
      // [5.31836 , 3.339844 ],
      // [5.26953 , 3.294918 ], 
    ] },

    blu2: { 
      heatRange: [32.5,45], gridXY:[2,-1], gridWH:[1,3], par: 3, 
      tees: [[2.216796875,-0.7294921875], [2.2080078125,-0.7822265625], [2.1357421875,-0.87890625], ],			
      pins: [[2.4091796875,1.1220703125], [2.60546875,1.328125], [2.3779296875,1.1796875], [2.6806640625,1.328125], [2.6455078125,1.23828125], ]

    }

};



/////////////////////////////////////////////////////////////////////////////////////////
////////  ADD TERRAIN  + TEXTURES  //////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////

export function getHeightAt(x, z, gridXZ, gridWH, heightData) {
  // console.log("func: G.getHeightAt")
  // console.log("\tx: "+x)
  // console.log("\tz: "+z)
  // console.log("\tgridXZ: "+gridXZ)
  // console.log("\tgridWH: "+gridWH)
  // console.log("\theightData: ")
  // console.log(heightData)
  // console.log("\t__________")
  // Bump map area in world coordinates
  const xMin = gridXZ[0];
  const xMax = gridXZ[0]+gridWH[0];
  const zMin = gridXZ[1];
  const zMax = gridXZ[1]+gridWH[1];

  // Normalize x and z within bump area
  const xNorm = (x - xMin) / (xMax - xMin);
  const zNorm = (z - zMin) / (zMax - zMin);

  // Clamp (optional safety)
  const u = Math.min(Math.max(xNorm, 0), 1);
  const v = Math.min(Math.max(zNorm, 0), 1);

  // Convert to pixel coordinates
  const px = Math.floor(u * (heightData.width - 1));
  const py = Math.floor(v * (heightData.height - 1));

  // Get pixel value
  const index = (py * heightData.width + px);
  const pixelValue = heightData.data[index]; // depends on format!

  // Scale pixel to world height
  const heightScale = WORLD_Z; // example scale factor
  const y = pixelValue * heightScale;

  // console.log("\t returned ht: "+y)
  return y;
}

export async function extractFromRaw(filename, gridW, gridH) {
  console.log("func: EXTRACT FROM RAW");
  console.log("\tfilename: "+filename);

  const response = await fetch(filename);
  const buffer = await response.arrayBuffer();

  const rawData = new Uint16Array(buffer);
  const width = gridW * 512;
  const height = gridH * 512;

  if (rawData.length !== width * height) {
    throw new Error(`Raw data size does not match expected dimensions: got ${rawData.length}, expected ${width * height}`);
  }

  const normalized = new Float32Array(width * height);
  for (let i = 0; i < rawData.length; i++) {
    normalized[i] = rawData[i] / 65535;
  }

  const heightData = {
    data: normalized,
    width: width,
    height: height,
  }
  return heightData
}


export function getLocalCoord(x,z, gridWH, gridXZ) {
  
  const xMin = gridXZ[0];
  const xMax = gridXZ[0]+gridWH[0];
  const zMin = gridXZ[1];
  const zMax = gridXZ[1]+gridWH[1];

  // Normalize x and z within bump area
  const xNorm = (x - xMin) / (xMax - xMin);
  const zNorm = (z - zMin) / (zMax - zMin);

  // Clamp (optional safety)
  const u = Math.min(Math.max(xNorm, 0), 1);
  const v = Math.min(Math.max(zNorm, 0), 1);

  return [ u , v ];
}


function passfornow () {
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
}



const surfaceColors = {
  rock:       [255, 255, 255],
  bunker:     [255, 128, 0],
  desert:     [255, 255, 0],
  dirt:       [0, 255, 0],

  ob:         [0, 255, 255],
  rough:      [0, 128, 255],
  fairway:    [0, 0, 255],
  green_edge: [128, 0, 255],
  green:      [255, 0, 255]
};

export function getSurfaceFromColor(r, g, b) {
  let closestSurface = 'ob';
  let minDist = Infinity;

  for (const [surface, color] of Object.entries(surfaceColors)) {
    const dr = r - color[0];
    const dg = g - color[1];
    const db = b - color[2];
    const dist = dr * dr + dg * dg + db * db;

    if (dist < minDist) {
      minDist = dist;
      closestSurface = surface;
    }
  }

  // Optionally log if very far (e.g., unexpected blended colors)
  // if (minDist > 500) {
  //   console.log(`Warning: unexpected color (${r},${g},${b}), closest surface: ${closestSurface}`);
  // } else {
  //   console.log("SURF: "+closestSurface)
  // }
  
  return closestSurface;
}

