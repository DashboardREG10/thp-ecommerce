const fs = require('fs');

let app = fs.readFileSync('app.js', 'utf8');

// 1. Fix Destination extraction
app = app.replace(
    /let zipCodeStr = row\['รหัสไปรษณีย์'\].*?\|\| '';/s,
    `let zipCodeStr = '';
        for (let key in row) {
            if (key.includes('รหัส') || key.toLowerCase().includes('zip')) {
                zipCodeStr = row[key];
                break;
            }
        }
        if (!zipCodeStr) zipCodeStr = row['เขตที่ทำการปลายทาง'] || row['จังหวัดปลายทาง'] || row['ปลายทาง'] || row['จังหวัด'] || '';`
);

// 2. Add failedReasonsMap
app = app.replace('const dailyMap = {};', 'const dailyMap = {};\n    const failedReasonsMap = {};');
app = app.replace(
    /if \(group === 'นำจ่ายสำเร็จเเล้ว'\) success\+\+;\s*else if \(group === 'คืนต้นทาง'\) returned\+\+;\s*else if \(group === 'รอจ่าย ณ ที่ทำการ'\) waiting\+\+;\s*else if \(group === 'โทรศัพท์ติดต่อผู้รับ'\) calling\+\+;\s*else if \(group === 'นำจ่ายไม่สำเร็จ'\) failed\+\+;\s*else inTransit\+\+;/s,
    `if (group === 'นำจ่ายสำเร็จเเล้ว') success++;
        else if (group === 'คืนต้นทาง') returned++;
        else if (group === 'รอจ่าย ณ ที่ทำการ') waiting++;
        else if (group === 'โทรศัพท์ติดต่อผู้รับ') calling++;
        else if (group === 'นำจ่ายไม่สำเร็จ') failed++;
        else inTransit++;

        if (group !== 'นำจ่ายสำเร็จเเล้ว' && group !== 'อยู่ระหว่างการขนส่ง') {
            failedReasonsMap[status] = (failedReasonsMap[status] || 0) + 1;
        }`
);

// 3. Expose failedReasonsMap
app = app.replace('dailyMap,', 'dailyMap, failedReasonsMap,');

// 4. Inject failedReasonsTableHtml
const failedReasonsCode = `
    let failedReasonsTableHtml = '';
    if (rd.failedReasonsMap) {
        const topFailed = Object.entries(rd.failedReasonsMap).sort((a,b) => b[1] - a[1]).slice(0, 5);
        if (topFailed.length > 0) {
            const maxFailed = topFailed[0][1];
            const failedList = topFailed.map((d, i) => {
                const heatPct = (d[1] / maxFailed) * 100;
                return \`
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <div style="font-size: 11px; color: #334155; font-weight: 500; display: flex; align-items: center; gap: 6px; width: calc(100% - 100px);">
                        <span style="color: #64748b; font-size: 10px; width: 14px; flex-shrink: 0;">\${i + 1}.</span>
                        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;" title="\${d[0]}">\${d[0]}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 50px; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden;">
                            <div style="height: 100%; width: \${heatPct}%; background: #f59e0b;"></div>
                        </div>
                        <div style="font-size: 11px; font-weight: 700; color: #0f172a; width: 35px; text-align: right;">
                            \${d[1].toLocaleString()}
                        </div>
                    </div>
                </div>\`;
            }).join('');
            
            failedReasonsTableHtml = \`
            <div style="background: white; border-radius: 8px; border: 1px solid #e2e8f0; padding: 15px; position: relative; margin-top: 15px;">
                <div style="font-size: 12px; font-weight: 700; color: #d97706; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                    <i class="fa-solid fa-triangle-exclamation" style="color: #d97706;"></i> สาเหตุที่นำจ่ายไม่สำเร็จ (Top 5)
                </div>
                \${failedList}
            </div>\`;
        }
    }
`;

app = app.replace('let destTableHtml = \'\';', failedReasonsCode + '\n    let destTableHtml = \'\';');
app = app.replace('                    ${destTableHtml}\n                </div>', '                    ${destTableHtml}\n                </div>\n                ${failedReasonsTableHtml}');

// 5. Bump Version
app = app.replace(/const APP_VERSION = '1\.24';/g, "const APP_VERSION = '1.25';");

fs.writeFileSync('app.js', app);
console.log('Patched V.1.25 Successfully');
