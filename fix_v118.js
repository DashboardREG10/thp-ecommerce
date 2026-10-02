const fs = require('fs');

let app = fs.readFileSync('app.js', 'utf8');

// 1. Fix Destination extraction
app = app.replace(
    /const dest = row\['เขตที่ทำการปลายทาง'\] \|\| 'ไม่ระบุ';/g,
    `let dest = row['เขตที่ทำการปลายทาง'] || row['จังหวัด'] || row['จังหวัดปลายทาง'] || row['ปลายทาง'] || row['ที่อยู่ปลายทาง'] || row['Province'] || row['ผู้รับ'] || 'ไม่ระบุ';
            if (typeof dest === 'string' && dest.length > 50) {
                const match = dest.match(/(?:จ\\.|จังหวัด)\\s*([ก-๙]+)/);
                dest = match ? match[1] : dest.substring(0, 50);
            }`
);

// 2. Base64 encode the PNG
const mapBase64 = 'data:image/png;base64,' + fs.readFileSync('thailand.png').toString('base64');

// 3. Replace the old SVG map with a professional image map
const oldMapStart = app.indexOf('// Map SVG');
const oldMapEnd = app.indexOf('canvas.innerHTML = `');

const newMap = `// Professional Map Image
    const mapSvg = \`
    <div style="height: 100%; width: 100%; min-height: 280px; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative;">
        <img src="\${mapBase64}" style="height: 200px; object-fit: contain; filter: drop-shadow(0px 8px 12px rgba(0,0,0,0.15));" />
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
            <!-- decorative pins -->
            <div style="position: absolute; top: -60px; left: -15px; width: 8px; height: 8px; background: #dc2626; border-radius: 50%; box-shadow: 0 0 0 2px white;"></div>
            <div style="position: absolute; top: 10px; left: 10px; width: 6px; height: 6px; background: #ef4444; border-radius: 50%; box-shadow: 0 0 0 2px white;"></div>
            <div style="position: absolute; top: 70px; left: -5px; width: 6px; height: 6px; background: #f87171; border-radius: 50%; box-shadow: 0 0 0 2px white;"></div>
        </div>
    </div>\`;

    `;

if (oldMapStart !== -1 && oldMapEnd !== -1) {
    app = app.substring(0, oldMapStart) + newMap + app.substring(oldMapEnd);
} else {
    console.error("Could not find old map string in app.js");
}

// 4. Bump version
app = app.replace(/const APP_VERSION = '1\.18';/, "const APP_VERSION = '1.22';");
app = app.replace(/const APP_VERSION = '1\.19';/, "const APP_VERSION = '1.22';");
app = app.replace(/const APP_VERSION = '1\.20';/, "const APP_VERSION = '1.22';");
app = app.replace(/const APP_VERSION = '1\.21';/, "const APP_VERSION = '1.22';");

fs.writeFileSync('app.js', app);
console.log('Successfully patched app.js to V.1.22');
