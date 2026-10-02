const fs = require('fs');
let app = fs.readFileSync('app.js', 'utf8');
app = app.replace('    canvas.innerHTML = \\n    <!-- HEADER -->', '    canvas.innerHTML = `\\n    <!-- HEADER -->');
fs.writeFileSync('app.js', app);
console.log('Fixed app.js properly');
