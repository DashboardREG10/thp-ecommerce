const fs = require('fs');

// 1. Update style.css
let css = fs.readFileSync('style.css', 'utf8');
css = css.replace(/font-family: 'Sukhumvit Set', sans-serif;/g, "font-family: 'Prompt', sans-serif;");
fs.writeFileSync('style.css', css);

// 2. Update index.html
let index = fs.readFileSync('index.html', 'utf8');
index = index.replace('<link rel="stylesheet" href="style.css?v=6">', '<link rel="stylesheet" href="style.css?v=7">');

// Add Google Font import for Prompt
const fontImport = `<link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap" rel="stylesheet">`;

if (!index.includes('family=Prompt')) {
    index = index.replace('<head>', '<head>\n    ' + fontImport);
}

// Bump APP_VERSION in app.js
let app = fs.readFileSync('app.js', 'utf8');
app = app.replace(/const APP_VERSION = '1\.34';/g, "const APP_VERSION = '1.35';");
fs.writeFileSync('app.js', app);

// Bump version in index.html script tag
index = index.replace('<script src="app.js?v=1.34"></script>', '<script src="app.js?v=1.35"></script>');

fs.writeFileSync('index.html', index);

console.log('Patched V.1.35 Successfully');
