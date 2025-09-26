import * as G from '../utils/globals.js'; // use as G.varName
import * as THREE from 'three';
import { HOLE_MANAGER } from '../managers/GameManager.js';
import { toggleHeat } from '../scenes/terrain.js';


const aimIncrement = 0.25; // degrees


const clubsToHandle = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "-", "="];
const clubKeys = { // === Club definitions FOR UI===
  "1": "driver",
  "2": "wood",
  "3": "3i",
  "5": "5i",
  "7": "7i",
  "9": "9i",
  "-": "gap",
  "=": "lob",
  "0": "putter",
};

export class Controller {
    constructor(gameManager) {
        this.type = "keyboard" // or wiimote, or ????
        this.active = true; // only enable input during shot setup or loading screens,except for advance button for loading screens
        this.GAME_MANAGER = gameManager;

        if ( (this.type) ==="keyboard" ) {
            this.initKeyboard()
        }
    }

    initKeyboard() {
        ///// KEYBOARD CONTROLS
        window.addEventListener('keydown', (event) => {
            if (
                event.key === 'h' || // heatmap toggle
                event.key === ' ' ||
                event.key === 'ArrowLeft' ||
                event.key === 'ArrowRight' ||
                event.key === 'ArrowUp' ||
                event.key === 'ArrowDown'
            ) {
                event.preventDefault();
            }

            if (event.key === 'h') {
                toggleHeat();
            }

            else if (event.key === 'ArrowLeft') {
                HOLE_MANAGER.changeAim( aimIncrement )
            } else if (event.key === 'ArrowRight') {
                HOLE_MANAGER.changeAim( -aimIncrement )
            } else if (event.key === ' ') {
                const swingPower = parseFloat(document.getElementById('swingPower').value);
                const swingSpin = parseFloat(document.getElementById('swingSpin').value);
                HOLE_MANAGER.processUserSwing(swingPower, swingSpin)

            }  else if (clubsToHandle.includes(event.key)) {
                event.preventDefault();
                console.log('Club key pressed:', event.key);
                
                const clubName = clubKeys[event.key]
                console.log('=', clubName);
                this.GAME_MANAGER.changeClub(clubName)
            }
        });
    }

  
}




