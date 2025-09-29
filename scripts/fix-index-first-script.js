const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '../admin-frontend/index.html');
let html = fs.readFileSync(file, 'utf8');

// Replace the first big inline <script> block under the 'Scripts' section with a safe ASCII-only version
const scriptsMarker = '<!-- Scripts -->';
const idxMarker = html.indexOf(scriptsMarker);
if (idxMarker === -1) {
  console.error('Scripts marker not found.');
  process.exit(1);
}
// find the first <script> after marker
const scriptOpenIdx = html.indexOf('<script>', idxMarker);
if (scriptOpenIdx === -1) {
  console.error('First script tag after marker not found.');
  process.exit(1);
}
const scriptCloseIdx = html.indexOf('</script>', scriptOpenIdx);
if (scriptCloseIdx === -1) {
  console.error('Closing script tag not found.');
  process.exit(1);
}

const safeScript = [
  '<script>',
  '  // Global error handlers (ASCII only to avoid encoding glitches)',
  '  window.addEventListener("error", (e) => {',
  '    console.error("JS Error:", e.error);',
  '    console.error("File:", e.filename, "@", e.lineno, ":", e.colno);',
  '  });',
  '  window.addEventListener("unhandledrejection", (e) => {',
  '    console.error("Unhandled Promise:", e.reason);',
  '  });',
  '',
  '  // Script loading counter',
  '  let scriptsLoaded = 0;',
  '  const totalScripts = 9;',
  '  const loadedScripts = new Set();',
  '',
  '  function onScriptLoad(scriptName) {',
  '    if (loadedScripts.has(scriptName)) return; // avoid double count',
  '    loadedScripts.add(scriptName);',
  '    scriptsLoaded++;',
  '    console.log(Loaded:  (/));',
  '    if (scriptsLoaded === totalScripts) {',
  '      console.log("All scripts loaded. Initializing app...");',
  '      setTimeout(initializeApp, 100);',
  '    }',
  '  }',
  '',
  '  function initializeApp() {',
  '    try {',
  '      const required = ["AppConfig","Utils","API","Auth","Components","Router","App"];',
  '      const missing = required.filter(obj => !window[obj]);',
  '      if (missing.length > 0) {',
  '        console.error("Missing globals:", missing);',
  '        showErrorPage("Missing JavaScript modules: " + missing.join(", "));',
  '        return;',
  '      }',
  '      if (window.App && typeof window.App.init === "function") {',
  '        window.App.init();',
  '      } else {',
  '        console.error("App.init not found");',
  '        showErrorPage("App initialization failed");',
  '      }',
  '    } catch (error) {',
  '      console.error("App initialization error", error);',
  '      showErrorPage("Initialization error: " + error.message);',
  '    }',
  '  }',
  '',
  '  function showErrorPage(message) {',
  '    document.body.innerHTML = ',
  '      <div style="padding:40px; text-align:center; font-family: Arial, sans-serif; background:#f5f5f5; min-height:100vh; display:flex; align-items:center; justify-content:center;">',
  '        <div style="background:white; padding:40px; border-radius:12px; box-shadow:0 4px 6px rgba(0,0,0,0.1); max-width:500px;">',
  '          <h2 style="color:#e74c3c; margin-bottom:20px;">',
  '            <i class="fas fa-exclamation-triangle" style="margin-right:10px;"></i>',
  '            Load Failed',
  '          </h2>',
  '          <p style="color:#666; margin-bottom:20px; line-height:1.6;"></p>',
  '          <button onclick="location.reload()" style="padding:12px 24px; background:#3498db; color:white; border:none; border-radius:6px; cursor:pointer; font-size:14px;">',
  '            Reload',
  '          </button>',
  '        </div>',
  '      </div>',
  '    ;',
  '  }',
  '</script>'
].join('\n');

html = html.slice(0, scriptOpenIdx) + safeScript + html.slice(scriptCloseIdx + '</script>'.length);
fs.writeFileSync(file, html, 'utf8');
console.log('Replaced first inline script block with ASCII-safe version.');
