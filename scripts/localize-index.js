const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '../admin-frontend/index.html');
let html = fs.readFileSync(file, 'utf8');

// 1) Restore Chinese UI text
html = html.replace(/<title>[\s\S]*?<\/title>/i, '<title>??????</title>');
html = html.replace(/<h1>[^<]*<\/h1>/i, '<h1>??????</h1>');
html = html.replace(/<span>[^<]*<\/span>/i, '<span>??????</span>');
html = html.replace(/<p class=\"subtitle\">[^<]*<\/p>/i, '<p class="subtitle">?????</p>');
html = html.replace(/(<span[^>]*id=\"user-name\"[^>]*>)[^<]*<\/span>/i, '</span>');
html = html.replace(/<p>\s*Loading\.\.+\s*<\/p>/i, '<p>???..</p>');

// 2) Fix onScriptLoad() block (replace entire function body)
const onloadLines = [
  'function onScriptLoad(scriptName) {',
  '            if (loadedScripts.has(scriptName)) {',
  '                return; // ??????',
  '            }',
  '',
  '            loadedScripts.add(scriptName);',
  '            scriptsLoaded++;',
  '            console.log(??????:  (/));',
  '',
  '            if (scriptsLoaded === totalScripts) {',
  '                console.log(\'????????????????...\');',
  '                setTimeout(initializeApp, 100); // ??????????????',
  '            }',
  '        }'
];
const onloadRepl = onloadLines.join('\n');
html = html.replace(/function\s+onScriptLoad\s*\(\s*scriptName\s*\)\s*\{[\s\S]*?\n\s*\}/, onloadRepl);

// 3) Localize initializeApp() messages back to Chinese (strings only)
html = html
  .replace('Missing required globals:', '?????????:')
  .replace('Missing JavaScript modules: ', '?????JavaScript??: ')
  .replace('App initialization failed', '???????')
  .replace('App initialization error', '???????')
  .replace('Initialization error: ', '?????: ')
  .replace('App.init not found', '??? App.init ??');

fs.writeFileSync(file, html, 'utf8');
console.log('index.html localized to Chinese and fixed header labels.');
