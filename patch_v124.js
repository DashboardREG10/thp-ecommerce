const fs = require('fs');

let app = fs.readFileSync('app.js', 'utf8');

// 1. Add getProvinceFromZip
const getProvinceCode = `
const PROVINCE_MAP = {
    '10': 'กรุงเทพมหานคร', '11': 'สมุทรปราการ', '12': 'นนทบุรี', '13': 'ปทุมธานี', '14': 'พระนครศรีอยุธยา',
    '15': 'อ่างทอง', '16': 'ลพบุรี', '17': 'สิงห์บุรี', '18': 'ชัยนาท', '19': 'สระบุรี',
    '20': 'ชลบุรี', '21': 'ระยอง', '22': 'จันทบุรี', '23': 'ตราด', '24': 'ฉะเชิงเทรา', '25': 'ปราจีนบุรี', '26': 'นครนายก', '27': 'สระแก้ว',
    '30': 'นครราชสีมา', '31': 'บุรีรัมย์', '32': 'สุรินทร์', '33': 'ศรีสะเกษ', '34': 'อุบลราชธานี', '35': 'ยโสธร', '36': 'ชัยภูมิ', '37': 'อำนาจเจริญ', '38': 'บึงกาฬ', '39': 'หนองบัวลำภู',
    '40': 'ขอนแก่น', '41': 'อุดรธานี', '42': 'เลย', '43': 'หนองคาย', '44': 'มหาสารคาม', '45': 'ร้อยเอ็ด', '46': 'กาฬสินธุ์', '47': 'สกลนคร', '48': 'นครพนม', '49': 'มุกดาหาร',
    '50': 'เชียงใหม่', '51': 'ลำพูน', '52': 'ลำปาง', '53': 'อุตรดิตถ์', '54': 'แพร่', '55': 'น่าน', '56': 'พะเยา', '57': 'เชียงราย', '58': 'แม่ฮ่องสอน',
    '60': 'นครสวรรค์', '61': 'อุทัยธานี', '62': 'กำแพงเพชร', '63': 'ตาก', '64': 'สุโขทัย', '65': 'พิษณุโลก', '66': 'พิจิตร', '67': 'เพชรบูรณ์',
    '70': 'ราชบุรี', '71': 'กาญจนบุรี', '72': 'สุพรรณบุรี', '73': 'นครปฐม', '74': 'สมุทรสาคร', '75': 'สมุทรสงคราม', '76': 'เพชรบุรี', '77': 'ประจวบคีรีขันธ์',
    '80': 'นครศรีธรรมราช', '81': 'กระบี่', '82': 'พังงา', '83': 'ภูเก็ต', '84': 'สุราษฎร์ธานี', '85': 'ระนอง', '86': 'ชุมพร',
    '90': 'สงขลา', '91': 'สตูล', '92': 'ตรัง', '93': 'พัทลุง', '94': 'ปัตตานี', '95': 'ยะลา', '96': 'นราธิวาส'
};
function getProvinceFromZip(zip) {
    if (!zip) return 'ไม่ระบุ';
    let z = String(zip).trim();
    if (z.length >= 2) {
        let prefix = z.substring(0, 2);
        if (PROVINCE_MAP[prefix]) return PROVINCE_MAP[prefix] + ' (' + z + ')';
    }
    return z;
}
`;

if (!app.includes('PROVINCE_MAP')) {
    app = app.replace('function getReportData', getProvinceCode + '\nfunction getReportData');
}

// 2. Fix extraction logic for destination
app = app.replace(
    /let dest = row\['เขตที่ทำการปลายทาง'\].*?dest\.substring\(0, 50\);\s*}/s,
    `let zipCodeStr = row['รหัสไปรษณีย์'] || row['รหัสไปรษณีย์ปลายทาง'] || row['Zipcode'] || row['zip'] || row['เขตที่ทำการปลายทาง'] || row['ปลายทาง'] || row['จังหวัด'] || '';
        let dest = getProvinceFromZip(zipCodeStr);`
);

// 3. Expose dailyMap
if (!app.includes('dailyMap,')) {
    app = app.replace('total, success, returned, waiting, calling, failed, inTransit, codAmount, codCount,', 'total, success, returned, waiting, calling, failed, inTransit, codAmount, codCount, dailyMap,');
}

// 4. Replace Map Image with Daily Heatmap
const oldMapStart = app.indexOf('// Professional Map Image');
const oldMapEnd = app.indexOf('canvas.innerHTML = `');

const newHeatmap = `// Generate Heatmap
    const dailyKeys = Object.keys(rd.dailyMap || {});
    // Sort dates
    dailyKeys.sort((a, b) => {
        let pa = a.split('/');
        let pb = b.split('/');
        let da = new Date(2026, parseInt(pa[1])-1, parseInt(pa[0]));
        let db = new Date(2026, parseInt(pb[1])-1, parseInt(pb[0]));
        return da - db;
    });
    
    let maxDaily = 0;
    dailyKeys.forEach(k => { if(rd.dailyMap[k] > maxDaily) maxDaily = rd.dailyMap[k]; });

    let heatmapCells = '';
    dailyKeys.forEach(k => {
        const val = rd.dailyMap[k];
        const pct = maxDaily > 0 ? val / maxDaily : 0;
        let bg = '#fee2e2'; // Lightest red
        let color = '#7f1d1d';
        if (pct > 0.8) { bg = '#b91c1c'; color = '#fff'; }
        else if (pct > 0.6) { bg = '#ef4444'; color = '#fff'; }
        else if (pct > 0.4) { bg = '#f87171'; color = '#fff'; }
        else if (pct > 0.2) { bg = '#fca5a5'; color = '#7f1d1d'; }

        heatmapCells += \`
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: \${bg}; border-radius: 4px; padding: 6px 2px; min-width: 38px; height: 38px; flex: 1; border: 1px solid rgba(0,0,0,0.05);">
                <div style="font-size: 8px; font-weight: 600; color: \${color}; opacity: 0.8; margin-bottom: 2px;">\${k}</div>
                <div style="font-size: 11px; font-weight: 800; color: \${color};">\${val}</div>
            </div>
        \`;
    });

    const mapSvg = \`
    <div style="width: 100%; display: flex; flex-direction: column; padding: 10px 5px;">
        <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-calendar-days" style="color: #dc2626;"></i> ความหนาแน่นชิ้นงาน (Daily Heatmap)
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 6px; width: 100%;">
            \${heatmapCells}
        </div>
    </div>\`;

    `;

if (oldMapStart !== -1 && oldMapEnd !== -1) {
    app = app.substring(0, oldMapStart) + newHeatmap + app.substring(oldMapEnd);
} else {
    console.error("Could not find Professional Map Image segment.");
}

// 5. Change "พื้นที่ปลายทางยอดนิยม (Top 10)" to "Pivot รหัสไปรษณีย์ (Top 10)"
app = app.replace('พื้นที่ปลายทางยอดนิยม (Top 10)', 'Pivot รหัสไปรษณีย์ / จังหวัด (Top 10)');

// 6. Bump Version
app = app.replace(/const APP_VERSION = '1\.23';/g, "const APP_VERSION = '1.24';");

fs.writeFileSync('app.js', app);
console.log('Patched V.1.24 Successfully');
