const fs = require('fs');
let app = fs.readFileSync('app.js', 'utf8');

// Wrap getReportData
app = app.replace('function getReportData(startDate, endDate) {', 'function getReportData(startDate, endDate) { try {');
app = app.replace('    return {\n        total,\n        success,', '    } catch (e) { alert("Error in getReportData: " + e.stack); throw e; }\n    return {\n        total,\n        success,');

// Wrap generateReport
app = app.replace('window.generateReport = function(type) {', 'window.generateReport = function(type) { try {');
app = app.replace(/window\.downloadReportAsImage = async function/g, '} catch (e) { alert("Error in generateReport: " + e.stack); console.error(e); } }\n\nwindow.downloadReportAsImage = async function');

fs.writeFileSync('app.js', app);
console.log('Patched try-catch');
