const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');


const holeName = "test"





const surfaces1 = [
    '#bounds',
    '#rough',
    '#fairway',
]
const surfaces2 = [
    '#teebox',
    '#green',
    '#green_edge',
]
const surfaces3 = [
    '#water',
    '#water_edge',
];
const surfaces4 = [
    '#bunker',
    '#dirt',
];

const maskGroups = {
    "mask1" : surfaces1,
    "mask2" : surfaces2,
    "mask3" : surfaces3,
    "mask4" : surfaces4
}


const WIDTH = 4096;
const HEIGHT = 4096;
const INPUT_SVG_PATH = path.resolve(__dirname, 'hole_'+holeName+'.svg');
const OUTPUT_DIR = path.resolve(__dirname, '../tjs/public/surface_masks');

(async () => {
  // Read SVG text from file
  const svgContent = await fs.promises.readFile(INPUT_SVG_PATH, 'utf-8');

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT });



  for (const [name, surfaces] of Object.entries(maskGroups)) {
    let selector1 = surfaces[0] || "#bruh";
    let selector2 = surfaces[1] || "#bruh";
    let selector3 = surfaces[2] || "#bruh";

    const bgmap = {
      "mask1":"red",
      "mask2":"black",
      "mask3":"black",
      "mask4":"black",
    }
    const bgCol = bgmap[name]
    // Set page content with inline SVG
    await page.setContent(`
      <html>
        <body style="margin:0; padding:0; background:${bgCol};">
          ${svgContent}
        </body>
      </html>
    `);


    // Hide all layers except current one; make current one black fill on white bg for mask
    await page.addStyleTag({
      content: `
        svg { 
            display: block;
            width: ${WIDTH}px;
            height: ${HEIGHT}px; 
        }
        svg * { 
          fill: rgb(0,0,0) !important; 
          stroke: rgb(0,0,0) !important;
        }
        ${selector1} * { 
          display: inline !important; 
          fill: rgb(255,0,0) !important; 
          stroke: rgb(255,0,0) !important;
        }
        ${selector2} * { 
          display: inline !important; 
          fill: rgb(0,255,0) !important; 
          stroke: rgb(0,255,0) !important;
        }
        ${selector3} * { 
          display: inline !important; 
          fill: rgb(0,0,255) !important; 
          stroke: rgb(0,0,255) !important;
        }
      `,
    });

      
    const outputPath = path.join(OUTPUT_DIR, `${name}_${holeName}.png`);
    await page.screenshot({ path: outputPath, omitBackground: true });
    console.log(`✅ Created mask: ${outputPath}`);
  }

  await browser.close();
})();
