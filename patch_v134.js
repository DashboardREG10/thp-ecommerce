const fs = require('fs');

// 1. Update style.css
let css = fs.readFileSync('style.css', 'utf8');
css = css.replace(/font-family: 'Bai Jamjuree', sans-serif;/g, "font-family: 'Sukhumvit Set', sans-serif;");
fs.writeFileSync('style.css', css);

// 2. Update index.html
let index = fs.readFileSync('index.html', 'utf8');
index = index.replace('<link rel="stylesheet" href="style.css?v=5">', '<link rel="stylesheet" href="style.css?v=6">');

// Bump APP_VERSION in app.js
let app = fs.readFileSync('app.js', 'utf8');
app = app.replace(/const APP_VERSION = '1\.33';/g, "const APP_VERSION = '1.34';");
fs.writeFileSync('app.js', app);

// Bump version in index.html script tag
index = index.replace('<script src="app.js?v=1.33"></script>', '<script src="app.js?v=1.34"></script>');

// Remove Google Font import (Bai Jamjuree) if we are strict about it, but we can leave it just in case. 
// Actually, removing it makes the page load faster since we don't use it anymore.
index = index.replace('<link href="https://fonts.googleapis.com/css2?family=Bai+Jamjuree:wght@300;400;500;600;700&display=swap" rel="stylesheet">', '');
index = index.replace('<link rel="preconnect" href="https://fonts.googleapis.com">', '');
index = index.replace('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>', '');

fs.writeFileSync('index.html', index);

console.log('Patched V.1.34 Successfully');
