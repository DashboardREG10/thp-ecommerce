const fs = require('fs');

let app = fs.readFileSync('app.js', 'utf8');

// 1. Remove failedReasonsTableHtml from the right column
app = app.replace(
    '                    ${destTableHtml}\n                </div>\n                ${failedReasonsTableHtml}',
    '                    ${destTableHtml}\n                </div>'
);

// 2. Inject failedReasonsTableHtml into the left column
app = app.replace(
    'ไม่เรียกเก็บ: <strong>${rd.nonCodCount.toLocaleString()}</strong></div>\n                            </div>\n                        </div>\n                    </div>',
    'ไม่เรียกเก็บ: <strong>${rd.nonCodCount.toLocaleString()}</strong></div>\n                            </div>\n                        </div>\n                    </div>\n                    ${failedReasonsTableHtml}'
);

// 3. Bump version
app = app.replace(/const APP_VERSION = '1\.25';/g, "const APP_VERSION = '1.26';");

fs.writeFileSync('app.js', app);
console.log('Patched V.1.26 Successfully');
