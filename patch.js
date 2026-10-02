const fs = require('fs');

let app = fs.readFileSync('app.js', 'utf8');
const pathData = fs.readFileSync('th_path.txt', 'utf8');

// 1. Fix Destination extraction
app = app.replace(
    /const dest = row\['เขตที่ทำการปลายทาง'\] \|\| 'ไม่ระบุ';/g,
    `let dest = row['เขตที่ทำการปลายทาง'] || row['จังหวัด'] || row['จังหวัดปลายทาง'] || row['ปลายทาง'] || row['ที่อยู่ปลายทาง'] || row['Province'] || row['ผู้รับ'] || 'ไม่ระบุ';
            if (dest.length > 50) {
                const match = dest.match(/(?:จ\\.|จังหวัด)\\s*([ก-๙]+)/);
                dest = match ? match[1] : dest.substring(0, 50);
            }`
);

// 2. Replace Map SVG
const oldMapStart = app.indexOf('// Realistic Map replaced');
const oldMapEnd = app.indexOf('canvas.innerHTML = `');

    const newMap = '// Map SVG (Accurate Thailand shape)\\n' +
    '    const mapSvg = `\\n' +
    '    <svg viewBox="-15 -10 160 260" style="height: 100%; min-height: 280px; width: 100%; filter: drop-shadow(2px 4px 6px rgba(0,0,0,0.08));" fill="#f8fafc" stroke="#94a3b8" stroke-width="0.6">\\n' +
    '        <path d="' + pathData + '" />\\n' +
    '        <!-- Callout Lines targeting central points -->\\n' +
    '        <circle cx="45" cy="100" r="2.5" fill="#dc2626" />\\n' +
    '        <line x1="45" y1="100" x2="160" y2="100" stroke="#dc2626" stroke-width="1.2" stroke-dasharray="2,2"/>\\n' +
    '        <circle cx="55" cy="60" r="2" fill="#ef4444" />\\n' +
    '        <line x1="55" y1="60" x2="160" y2="60" stroke="#ef4444" stroke-width="1.2" stroke-dasharray="2,2"/>\\n' +
    '        <circle cx="40" cy="180" r="2" fill="#f87171" />\\n' +
    '        <line x1="40" y1="180" x2="160" y2="180" stroke="#f87171" stroke-width="1.2" stroke-dasharray="2,2"/>\\n' +
    '    </svg>`;\\n\\n    ';

app = app.substring(0, oldMapStart) + newMap + app.substring(oldMapEnd);

// 3. Bump version
app = app.replace(/const APP_VERSION = '1\.19';/, "const APP_VERSION = '1.20';");

fs.writeFileSync('app.js', app);
console.log('Successfully updated app.js');
