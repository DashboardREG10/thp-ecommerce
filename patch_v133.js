const fs = require('fs');

let app = fs.readFileSync('app.js', 'utf8');

// 1. Remove Pivot container and expand mapSvg (Heatmap)
app = app.replace(
    `            <!-- Thailand Map + Top 10 (Moved to bottom, Expanded) -->
            <div style="display: flex; gap: 10px; align-items: center; border-radius: 8px; flex: 1;">
                <div style="flex: 0 0 140px; height: 100%; display: flex; align-items: center; justify-content: center;">
                    \${mapSvg}
                </div>
                <div style="flex: 1; background: #fff; padding: 15px; border: 1px solid #e2e8f0; border-radius: 6px; box-shadow: -2px 4px 10px rgba(0,0,0,0.03); position: relative;">
                    <!-- Triangle pointer pointing to map -->
                    <div style="position: absolute; left: -8px; top: 40px; width: 0; height: 0; border-top: 8px solid transparent; border-bottom: 8px solid transparent; border-right: 8px solid #e2e8f0;"></div>
                    <div style="position: absolute; left: -6px; top: 40px; width: 0; height: 0; border-top: 8px solid transparent; border-bottom: 8px solid transparent; border-right: 8px solid #fff;"></div>
                    
                    <div style="font-size: 11px; font-weight: 700; color: #dc2626; margin-bottom: 8px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 4px;">
                        <i class="fa-solid fa-map-location-dot"></i> Pivot รหัสไปรษณีย์ / จังหวัด (Top 10)
                    </div>
                    \${destTableHtml}
                </div>
            </div>`,
    `            <!-- Daily Heatmap -->
            <div style="border-radius: 8px; flex: 1; margin-top: 15px; background: #fff; border: 1px solid #e2e8f0; padding: 15px; box-shadow: -2px 4px 10px rgba(0,0,0,0.03);">
                \${mapSvg}
            </div>`
);

// 2. Change mapSvg layout to grid (7 columns)
app = app.replace(
    `<div style="width: 100%; display: flex; flex-direction: column; padding: 10px 5px;">
        <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-calendar-days" style="color: #dc2626;"></i> ความหนาแน่นชิ้นงาน (Daily Heatmap)
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 6px; width: 100%;">
            \${heatmapCells}
        </div>
    </div>`,
    `<div style="width: 100%; display: flex; flex-direction: column;">
        <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 6px;">
            <i class="fa-solid fa-calendar-days" style="color: #dc2626;"></i> ความหนาแน่นชิ้นงาน (Daily Heatmap)
        </div>
        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; width: 100%;">
            \${heatmapCells}
        </div>
    </div>`
);

// 3. Keep track of critical items for the popup
app = app.replace(
    `const allStatusCounts = {};
    const dailyData = {};`,
    `const allStatusCounts = {};
    const dailyData = {};
    window.criticalItemsData = { sla24H: [], addressIssue: [] };`
);

app = app.replace(
    `                if (now > slaTargetTime + 86400000) {
                    sla24HOverCount++;
                }`,
    `                if (now > slaTargetTime + 86400000) {
                    sla24HOverCount++;
                    window.criticalItemsData.sla24H.push(row);
                }`
);

app = app.replace(
    `            if (status.includes('จ่าหน้า') || status.includes('ไม่มีเลข') || status.includes('ที่อยู่ไม่ชัดเจน')) {
                addressIssueCount++;
            }`,
    `            if (status.includes('จ่าหน้า') || status.includes('ไม่มีเลข') || status.includes('ที่อยู่ไม่ชัดเจน')) {
                addressIssueCount++;
                window.criticalItemsData.addressIssue.push(row);
            }`
);

// 4. Add the modal build function to app.js
const modalScript = `
window.showCriticalModal = () => {
    if(!window.criticalItemsData) return;
    
    let html = '<h4 style="color:#dc2626; margin-bottom:10px;"><i class="fa-solid fa-clock"></i> เกิน SLA 24H (' + window.criticalItemsData.sla24H.length + ' ชิ้น)</h4>';
    html += buildCriticalTable(window.criticalItemsData.sla24H);
    
    html += '<h4 style="color:#d97706; margin-top:25px; margin-bottom:10px;"><i class="fa-solid fa-map-location-dot"></i> รอแก้ที่อยู่ (' + window.criticalItemsData.addressIssue.length + ' ชิ้น)</h4>';
    html += buildCriticalTable(window.criticalItemsData.addressIssue);
    
    document.getElementById('criticalModalContent').innerHTML = html;
    document.getElementById('criticalModal').style.display = 'flex';
};

window.buildCriticalTable = (items) => {
    if (items.length === 0) return '<p style="color: #64748b; font-size: 0.85rem; padding: 10px; background: #f8fafc; border-radius: 4px; border: 1px dashed #cbd5e1;">ไม่มีรายการในกลุ่มนี้</p>';
    let html = '<table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 6px; overflow: hidden;">';
    html += '<tr style="background: #1e293b; color: white;"><th style="padding: 10px; text-align: left;">Tracking</th><th style="padding: 10px; text-align: left;">วันที่รับฝาก</th><th style="padding: 10px; text-align: left;">สถานะปัจจุบัน</th><th style="padding: 10px; text-align: left;">ผู้รับ</th></tr>';
    
    items.slice(0, 100).forEach(row => {
        const track = row['สิ่งของ'] || row['หมายเลขสิ่งของ'] || row['บาร์โค้ด'] || '-';
        const date = row['วันที่รับฝาก'] || '-';
        const status = row['สถานะปัจจุบัน'] || '-';
        const receiver = row['ชื่อผู้รับ'] || row['ผู้รับ'] || '-';
        
        const qmsUrl = track !== '-' ? \`http://qms.thailandpost.com/web/Tracking/singleTracking.aspx?type=item&id=\${track}\` : '#';
        const trackHtml = \`<a href="\${qmsUrl}" target="_blank" style="color: #3b82f6; font-weight: bold; text-decoration: none;">\${track}</a>\`;
        
        html += \`<tr style="border-bottom: 1px solid #e2e8f0; background: white;"><td style="padding: 10px;">\${trackHtml}</td><td style="padding: 10px; color:#475569;">\${date}</td><td style="padding: 10px; color: #b91c1c; font-weight:500;">\${status}</td><td style="padding: 10px;">\${receiver}</td></tr>\`;
    });
    
    if (items.length > 100) {
        html += \`<tr><td colspan="4" style="text-align: center; padding: 12px; background: #f1f5f9; color: #475569; font-weight: 500;">... และอีก \${items.length - 100} รายการ (แสดงผลสูงสุด 100 รายการ)</td></tr>\`;
    }
    html += '</table>';
    return html;
};
`;

if (!app.includes('window.showCriticalModal =')) {
    app += '\n' + modalScript;
}

app = app.replace(/const APP_VERSION = '1\.32';/g, "const APP_VERSION = '1.33';");
fs.writeFileSync('app.js', app);

// ============================================
// Patch index.html
let index = fs.readFileSync('index.html', 'utf8');

// Remove Exceptions menu
index = index.replace(
    / *<a href="#" class="nav-item" id="nav-exceptions" onclick="switchView\('exceptions'\)">\s*<i class="fa-solid fa-triangle-exclamation"><\/i>\s*<span>รายการผิดปกติ<\/span>\s*<\/a>\n/,
    ''
);

// Add onclick to critical card
index = index.replace(
    'title="พัสดุที่มีสถานะผิดปกติที่อาจนำไปสู่การตีกลับ เช่น ที่อยู่ไม่ชัดเจน หรือติดต่อไม่ได้ (ไม่รวมพัสดุที่ถูกปฏิเสธแล้วซึ่งต้องตีกลับแน่นอน) ควรเร่งตรวจสอบและแก้ไขทันที"',
    'title="คลิกเพื่อดูรายการพัสดุ" onclick="showCriticalModal()"'
);
index = index.replace(
    '<div class="kpi-card" style="border: 1px solid #fca5a5; border-top: 3px solid #ef4444; background: #fff5f5; padding: 1.25rem; position: relative; cursor: help;" title="คลิกเพื่อดูรายการพัสดุ" onclick="showCriticalModal()">',
    '<div class="kpi-card" style="border: 1px solid #fca5a5; border-top: 3px solid #ef4444; background: #fff5f5; padding: 1.25rem; position: relative; cursor: pointer;" title="คลิกเพื่อดูรายการพัสดุ" onclick="showCriticalModal()">'
);

// Add critical modal HTML
const modalHtml = `
    <!-- Critical Items Modal -->
    <div id="criticalModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15,23,42,0.7); z-index: 9999; justify-content: center; align-items: center; backdrop-filter: blur(4px);">
        <div style="background: #f8fafc; border-radius: 12px; width: 90%; max-width: 900px; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);">
            <div style="padding: 20px 25px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: white; border-radius: 12px 12px 0 0;">
                <h3 style="margin: 0; color: #b91c1c; display:flex; align-items:center; gap:10px;"><i class="fa-solid fa-triangle-exclamation" style="font-size:1.2rem;"></i> รายการพัสดุเฝ้าระวังพิเศษ / เสี่ยงตีกลับ</h3>
                <button onclick="document.getElementById('criticalModal').style.display='none'" style="background: #f1f5f9; border: none; font-size: 1.2rem; cursor: pointer; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #64748b; transition: all 0.2s;">
                    <i class="fa-solid fa-times"></i>
                </button>
            </div>
            <div style="padding: 25px; overflow-y: auto;" id="criticalModalContent">
                <!-- Content injected here -->
            </div>
        </div>
    </div>
</body>`;

if (!index.includes('id="criticalModal"')) {
    index = index.replace('</body>', modalHtml);
}

index = index.replace(
    '<script src="app.js?v=1.32"></script>',
    '<script src="app.js?v=1.33"></script>'
);

fs.writeFileSync('index.html', index);

console.log('Patched V.1.33 Successfully');
