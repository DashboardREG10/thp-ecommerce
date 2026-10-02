const fs = require('fs');

// 1. Fix app.js (Remove the bubble tail)
let app = fs.readFileSync('app.js', 'utf8');
app = app.replace(
    '<div style="position: absolute; left: -6px; top: 20px; width: 12px; height: 12px; background: white; border-left: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; transform: rotate(45deg);"></div>',
    ''
);
// Bump version in app.js
app = app.replace(/const APP_VERSION = '1\.29';/g, "const APP_VERSION = '1.30';");
fs.writeFileSync('app.js', app);


// 2. Fix index.html (Add tooltips)
let index = fs.readFileSync('index.html', 'utf8');

index = index.replace(
    '<div class="kpi-card" style="border-top: 3px solid #10b981; padding: 1.25rem;">',
    '<div class="kpi-card" style="border-top: 3px solid #10b981; padding: 1.25rem; cursor: help;" title="อัตราส่วนของพัสดุที่สามารถนำจ่ายสำเร็จภายในระยะเวลามาตรฐาน (SLA) ที่กำหนด">'
);

index = index.replace(
    '<div class="kpi-card" style="border: 1px solid #fca5a5; background: #fef2f2; position: relative; padding: 1.25rem;">',
    '<div class="kpi-card" style="border: 1px solid #fca5a5; background: #fef2f2; position: relative; padding: 1.25rem; cursor: help;" title="พัสดุที่มีสถานะผิดปกติ เช่น ที่อยู่ไม่ชัดเจน ผู้รับปฏิเสธ หรือมีโอกาสถูกตีกลับสูง ควรดำเนินการตรวจสอบทันที">'
);

// Bump version in index.html
index = index.replace(
    '<script src="app.js?v=1.29"></script>',
    '<script src="app.js?v=1.30"></script>'
);
fs.writeFileSync('index.html', index);

console.log('Patched V.1.30 Successfully');
