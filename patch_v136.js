const fs = require('fs');
let app = fs.readFileSync('app.js', 'utf8');

// 1. Shrink "สรุปข้อมูลเชิงสถิติ"
app = app.replace(
    '<div style="border: 1px solid #cbd5e1; background: rgba(248, 250, 252, 0.85); padding: 15px; margin-bottom: 25px; position: relative; z-index: 2;">',
    '<div style="border: 1px solid #cbd5e1; background: rgba(248, 250, 252, 0.85); padding: 8px 12px; margin-bottom: 15px; position: relative; z-index: 2;">'
);
app = app.replace(
    '<div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">',
    '<div style="font-size: 10px; font-weight: 700; color: #0f172a; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">'
);
app = app.replace(
    '<div style="font-size: 11px; color: #334155; line-height: 2.2; font-weight: 500;">',
    '<div style="font-size: 9px; color: #334155; line-height: 1.8; font-weight: 500;">'
);

// 2. Shrink "ความหนาแน่นชิ้นงาน (Daily Heatmap)" Cells
app = app.replace(
    'heatmapCells += `\n            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: ${bg}; border-radius: 4px; padding: 6px 2px; min-width: 38px; height: 38px; flex: 1; border: 1px solid rgba(0,0,0,0.05);">\n                <div style="font-size: 8px; font-weight: 600; color: ${color}; opacity: 0.8; margin-bottom: 2px;">${k}</div>\n                <div style="font-size: 11px; font-weight: 800; color: ${color};">${val}</div>\n            </div>\n        `;',
    'heatmapCells += `\n            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: ${bg}; border-radius: 2px; padding: 2px; min-width: 0; height: 26px; flex: 1; border: 1px solid rgba(0,0,0,0.05);">\n                <div style="font-size: 6px; font-weight: 600; color: ${color}; opacity: 0.8; margin-bottom: 1px;">${k}</div>\n                <div style="font-size: 9px; font-weight: 800; color: ${color};">${val}</div>\n            </div>\n        `;'
);

// 3. Shrink "ความหนาแน่นชิ้นงาน (Daily Heatmap)" Grid & Header
app = app.replace(
    '<div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 6px;">',
    '<div style="font-size: 10px; font-weight: 700; color: #0f172a; margin-bottom: 6px; display: flex; align-items: center; gap: 8px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 4px;">'
);
app = app.replace(
    '<div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; width: 100%;">',
    '<div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; width: 100%;">'
);

// 4. Shrink "Daily Heatmap" Outer Container
app = app.replace(
    '<div style="border-radius: 8px; flex: 1; margin-top: 15px; background: #fff; border: 1px solid #e2e8f0; padding: 15px; box-shadow: -2px 4px 10px rgba(0,0,0,0.03);">',
    '<div style="border-radius: 8px; flex: 1; margin-top: 5px; background: #fff; border: 1px solid #e2e8f0; padding: 8px; box-shadow: -2px 4px 10px rgba(0,0,0,0.03);">'
);


app = app.replace(/const APP_VERSION = '1\.35';/g, "const APP_VERSION = '1.36';");
fs.writeFileSync('app.js', app);

let index = fs.readFileSync('index.html', 'utf8');
index = index.replace('<script src="app.js?v=1.35"></script>', '<script src="app.js?v=1.36"></script>');
fs.writeFileSync('index.html', index);

console.log('Patched V.1.36 Successfully');
