const fs = require('fs');
let app = fs.readFileSync('app.js', 'utf8');

// 1. Fix the map logic to filter out the excluded statuses
const oldMapLogic = `if (group !== 'นำจ่ายสำเร็จเเล้ว' && group !== 'อยู่ระหว่างการขนส่ง') {
            failedReasonsMap[status] = (failedReasonsMap[status] || 0) + 1;
        }`;

const newMapLogic = `if (group !== 'นำจ่ายสำเร็จเเล้ว' && group !== 'อยู่ระหว่างทาง/นำจ่าย') {
            // Exclude specified statuses (using includes to catch variations like เเยก vs แยก)
            const s = status.replace(/เ/g, 'เ'); // normalize just in case, but includes handles it mostly
            if (!s.includes('ถึง ปณ.ปลายทาง เตรียม') && 
                !s.includes('ถึง ปณ ปลายทาง เตรียม') && 
                !s.includes('ส่งออกจากศูนย์คัดเเยก') && 
                !s.includes('ส่งออกจากศูนย์คัดแยก') && 
                !s.includes('ปณ ต้นทางส่งคืนบริษัท') && 
                !s.includes('ปณ.ต้นทางส่งคืนบริษัท') && 
                !s.includes('ถึงศูนย์คัดเเยก') && 
                !s.includes('ถึงศูนย์คัดแยก')) {
                failedReasonsMap[status] = (failedReasonsMap[status] || 0) + 1;
            }
        }`;

app = app.replace(oldMapLogic, newMapLogic);

// 2. Fix the HTML generation
app = app.replace(
    `const topFailed = Object.entries(rd.failedReasonsMap).sort((a,b) => b[1] - a[1]).slice(0, 5);`,
    `const topFailed = Object.entries(rd.failedReasonsMap).sort((a,b) => b[1] - a[1]);` // Show all
);

app = app.replace(
    `<div style="font-size: 12px; font-weight: 700; color: #d97706; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                    <i class="fa-solid fa-triangle-exclamation" style="color: #d97706;"></i> สาเหตุที่นำจ่ายไม่สำเร็จ (Top 5)
                </div>
                \${failedList}`,
    `<div style="font-size: 12px; font-weight: 700; color: #d97706; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                    <i class="fa-solid fa-triangle-exclamation" style="color: #d97706;"></i> สาเหตุที่นำจ่ายไม่สำเร็จ
                </div>
                <div style="max-height: 250px; overflow-y: auto; padding-right: 5px;">
                    \${failedList}
                </div>`
);

// Bump version
app = app.replace(/const APP_VERSION = '1\.28';/g, "const APP_VERSION = '1.29';");

fs.writeFileSync('app.js', app);
console.log('Patched V.1.29 Successfully');
