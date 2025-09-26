import * as G from '../utils/globals.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CLUB_PROFILES } from '../utils/clubProfiles.js';
import { Box3, Vector3 } from 'three';
import gsap from "gsap";

const awayFromBody = G.ftTo(2.6)/2 // div 2 cus center point
const aboveBall = G.ftTo(2.6) // div 2 cus center point
const behindBall = G.ftTo(0.45);


export class Club {
    constructor() {
        this.name = "";
        this.model = null;
        
        this.displayName = null;
        this.launchAngle = null;
        this.maxPower = null;
        this.minSwingSpin = null;
        this.maxSwingSpin = null;
        this.spinRate = null;
        this.drag = null;
        this.carry = null;
    }
    
    async initClubs() {
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
                console.log('...LOADING CLUB: ' + name);

                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = G.ftTo(3) / maxDim;

                gltf.scene.scale.set(scale, scale, scale);
                gltf.scene.rotateX(-Math.PI);
                gltf.scene.rotateY(-Math.PI);
                gltf.scene.rotateZ(Math.PI / 4 * 0.85);

                CLUB_PROFILES[name]["model"] = gltf.scene;
                resolve();
                },
                undefined,
                (error) => {
                console.error(`Error loading club ${name}:`, error);
                reject(error);
                }
            );
            });
        });

        // Await all club models to finish loading
        await Promise.all(loadClubModels);

        console.log("DONE assigning current club model");
    }

    async updateClubData(name) {

        const clubMesh = CLUB_PROFILES[name]['model'].clone();
        clubMesh.position.set(awayFromBody, aboveBall, behindBall,);

        this.name = name;
        this.model = clubMesh;
        
        this.displayName = CLUB_PROFILES[name]['displayName'];
        this.launchAngle = CLUB_PROFILES[name]['launchAngle'];
        this.maxPower = CLUB_PROFILES[name]['maxPower'];
        this.minSwingSpin = CLUB_PROFILES[name]['minSwingSpin'];
        this.maxSwingSpin = CLUB_PROFILES[name]['maxSwingSpin'];
        this.spinRate = CLUB_PROFILES[name]['spinRate'];
        this.drag = CLUB_PROFILES[name]['drag'];
        this.carry = CLUB_PROFILES[name]['carry'];
    }


    /// ANIMATIONS
    
    swingAnim() {
        gsap.to(this.model.rotation, {
        x: -Math.PI / 2,
        duration: 1.5,
        ease: "power2.in",
        onComplete: () => {
            gsap.to(this.model.rotation, {
            x: 0,
            duration: 0.3,
            ease: "power2.out"
            });
        }
        });
    }
    
    putt() {}
    twirl() {}
    smash() {}
    drop() {}
}

