const fs = require('fs');
let app = fs.readFileSync('app.js', 'utf8');

app = app.replace(
    /ไม่เรียกเก็บ: <strong>\$\{rd\.nonCodCount\.toLocaleString\(\)\}<\/strong><\/div>\s*<\/div>\s*<\/div>\s*<\/div>/,
    `ไม่เรียกเก็บ: <strong>\${rd.nonCodCount.toLocaleString()}</strong></div>
                        </div>
                    </div>
                </div>
                \${failedReasonsTableHtml}`
);

app = app.replace(/const APP_VERSION = '1\.26';/g, "const APP_VERSION = '1.27';");

fs.writeFileSync('app.js', app);
console.log('Patched V.1.27 Successfully');
