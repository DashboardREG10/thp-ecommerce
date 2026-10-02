const fs = require('fs');
let app = fs.readFileSync('app.js', 'utf8');

// The layout right now is:
//                 </div>
//                 ${failedReasonsTableHtml}
//             </div>
//         </div>
//
//         <!-- RIGHT COLUMN -->

app = app.replace(
    /<\/div>\s*\$\{failedReasonsTableHtml\}\s*<\/div>\s*<\/div>\s*<!-- RIGHT COLUMN -->/,
    `</div>
            </div>
            \${failedReasonsTableHtml}
        </div>

        <!-- RIGHT COLUMN -->`
);

// Bump version
app = app.replace(/const APP_VERSION = '1\.27';/g, "const APP_VERSION = '1.28';");

fs.writeFileSync('app.js', app);
console.log('Patched V.1.28 Successfully');
