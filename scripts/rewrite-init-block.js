const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '../admin-frontend/index.html');
let html = fs.readFileSync(file, 'utf8');
const marker = 'function initializeApp() {';
const start = html.indexOf(marker);
if (start < 0) { console.error('marker not found'); process.exit(1); }
let i = start + marker.length;
let depth = 1;
let inS = false, inD = false, inB = false, esc = false;
for(; i < html.length; i++){
  const ch = html[i];
  if (esc) { esc = false; continue; }
  if (ch === '\\') { esc = true; continue; }
  if (inS) { if (ch === "'") inS = false; continue; }
  if (inD) { if (ch === '"') inD = false; continue; }
  if (inB) { if (ch === '') inB = false; continue; }
  if (ch === "'") { inS = true; continue; }
  if (ch === '"') { inD = true; continue; }
  if (ch === '') { inB = true; continue; }
  if (ch === '{') depth++;
  else if (ch === '}') { depth--; if (depth === 0) { i++; break; } }
}
const end = i; // position after closing }
const lines = [
  'function initializeApp() {',
  '            try {',
  '                const required = ["AppConfig","Utils","API","Auth","Components","Router","App"];',
  '                const missing = required.filter(obj => !window[obj]);',
  '                if (missing.length > 0) {',
  '                    console.error(\'Missing required globals:\', missing);',
  '                    showErrorPage(\'Missing JavaScript modules: \'+ missing.join(\', \'));',
  '                    return;',
  '                }',
  '                if (window.App && typeof window.App.init === \"function\") {',
  '                    window.App.init();',
  '                } else {',
  '                    console.error(\'App.init not found\');',
  '                    showErrorPage(\'App initialization failed\');',
  '                }',
  '            } catch (error) {',
  '                console.error(\'App initialization error\', error);',
  '                showErrorPage(\'Initialization error: \'+ error.message);',
  '            }',
  '        }'
];
const newFunc = lines.join('\n');
html = html.slice(0, start) + newFunc + html.slice(end);
fs.writeFileSync(file, html, 'utf8');
console.log('initializeApp block replaced');
