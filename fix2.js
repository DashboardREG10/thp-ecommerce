const fs = require('fs');
let app = fs.readFileSync('app.js', 'utf8');
const base64str = 'data:image/png;base64,' + fs.readFileSync('thailand.png').toString('base64');
app = app.replace('src="${mapBase64}"', 'src="' + base64str + '"');
app = app.replace(/const APP_VERSION = '1\.22';/g, "const APP_VERSION = '1.23';");
fs.writeFileSync('app.js', app);
console.log('Fixed ReferenceError');
