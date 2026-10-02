const fs = require('fs');
const app = fs.readFileSync('app.js', 'utf8');

const end = app.indexOf('<!-- RIGHT COLUMN -->');
const start = app.lastIndexOf('<div', end - 2000);

if(start !== -1 && end !== -1) {
    console.log(app.substring(start, end));
} else {
    console.log("NOT FOUND.");
}
