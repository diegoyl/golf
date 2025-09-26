// GameManager.js
import * as G from '../utils/globals.js';
import * as THREE from 'three';

// objects
import { createCup } from "../objects/cupObj.js";
import { createFlag } from "../objects/flagObj.js";
import { CLUB, createAvatar } from "../objects/avatarObj.js";

// managers
import { CAM_MANAGER } from "./CamManager.js";
// import { UIManager } from "./UIManager.js";
import { HoleManager } from "./HoleManager.js";

//other
import { activateWiimote } from "../input/wiimote.js";
import { CLUB_PROFILES } from "../utils/clubProfiles.js";
import { loadTerrain, replaceHoleModel } from '../scenes/terrain.js';


export let HOLE_MANAGER;

//// List of sub routings which are put together in buildRouting()
const routings = {
    grn: ["grn1","grn2", "grn3", "grn4", "grn5", "grn6", "grn7", "grn8", "grn9"], 
    red: ["red1","red2", "red3", "red4", "red5", "red6", "red7", "red8", "red9"], 
    blu: ["blu1","blu2", "blu3", "blu4", "blu5", "blu6", "blu7", "blu8", "blu9"],
    alt1: ["drive","blu1","blu9","blu1","blu9"] 
}

function buildRouting(courses) {
    let routing = []
    for (const c of courses) { 
      const new_routing = routings[c]
      routing.push(...new_routing); 
    }
    console.log("built routing: "+routing)
    return routing
}

export class GameManager {
  constructor(courses=["alt1"]) {
    this.routing = buildRouting(courses);
    this.maxHoles = this.routing.length;
    this.currentHole = 1;

    this.scorecard = [];
    this.fieldScores = {
      McIlroy: -10,
      Scheffler: -12,
      Rahm: -8,
      Etc: 0,
    };

    this.ballInMotion = false;

    this.settings = {
      greenSpeed: 1,
      wind: 1,
      tees: "black", // green, blue, black
      cupRadius: G.CUP_RADIUS,
    };
    
    // UI_MANAGER = new UIManager();

    this.cup = null;
    this.flag = null;
    this.avatar = null;
  }

  async createGameAssets() {
    this.cup = await createCup();
    this.flag = await createFlag();
    this.avatar = await createAvatar(); // also get club models
  }


  async loadIsland() {
    await loadTerrain("island")
  }

  async changeClub(name) {
    console.log("switching to " + name);

    const oldClubMesh = CLUB.model;
    let avatar = this.avatar;
    if (avatar.children.includes(oldClubMesh)) {
      avatar.remove(oldClubMesh);
      console.log("removing old club");
    }

    // if (!CLUB.model) {
    //   console.log("Not all clubs loaded! sleeping...");
    //   await new Promise((r) => setTimeout(r, 1000));
    // }

    await CLUB.updateClubData(name);
    avatar.add(CLUB.model);
  }
  
  async loadHole(holeIdx=(this.currentHole-1), byName=false) {
    let holeName = holeIdx; // assume by name true
    if (!byName) {
      console.log(`Loading hole ${holeIdx+1}`);
      console.log("routing: "+this.routing);
      holeName = this.routing[holeIdx];
    }
    console.log("holename: "+holeName)

    await replaceHoleModel(holeName);

    HOLE_MANAGER = new HoleManager(this, holeName);
    await HOLE_MANAGER.createHole();
    
    
    HOLE_MANAGER.setupHole();
  }

  changeTee(idx) {
    HOLE_MANAGER.setupHole("random",idx-1);
  }
  setPinLocation(x, y, z) {
    console.log("Moving pin to:", x, y, z);
    this.cup.position.set(x, y - G.CUP_DIG/2 +G.inTo(0)  , z);
    this.flag.position.set(x, y + G.FLAGSTICK_HT/2 - G.inTo(5), z);
  }

  registerStroke() { // move to holeMang ?
    this.strokes += 1;
  }

  finishHole() {
    this.scorecard.push({
      hole: this.currentHole,
      strokes: this.strokes,
    });

    if (this.currentHole < this.maxHoles) {
      this.startHole(this.currentHole + 1);
    } else {
      this.endGame();
    }
  }

  endGame() {
    console.log("Game over!");
    console.log("Scorecard:", this.scorecard);
  }



  async activateWiimote(){
    // todo:implement
  }
  processInput() {

  }

  HMupdateBall() {
    HOLE_MANAGER.updateBall()
  }


  getSlopeAt(x, z, spacing = 1) {
    const hL = G.getHeightAt(x - spacing, z, HOLE_MANAGER.gridXY, HOLE_MANAGER.gridWH, HOLE_MANAGER.heightData);; // left
    const hR = G.getHeightAt(x + spacing, z, HOLE_MANAGER.gridXY, HOLE_MANAGER.gridWH, HOLE_MANAGER.heightData);; // right
    const hD = G.getHeightAt(x, z - spacing, HOLE_MANAGER.gridXY, HOLE_MANAGER.gridWH, HOLE_MANAGER.heightData);; // down
    const hU = G.getHeightAt(x, z + spacing, HOLE_MANAGER.gridXY, HOLE_MANAGER.gridWH, HOLE_MANAGER.heightData);; // up

    // partial derivatives (slopes)
    const dx = (hR - hL) / (2 * spacing);
    const dz = (hU - hD) / (2 * spacing);

    return new THREE.Vector2(-dx, -dz); // negative = "downhill"
  }
}