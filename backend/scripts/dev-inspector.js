#!/usr/bin/env node
// Cross-platform dev:inspector runner
const { spawn } = require('child_process');
const path = require('path');

// Ensure env var is set
process.env.ENABLE_INSPECTOR = process.env.ENABLE_INSPECTOR || '1';
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const nodemonBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const args = ['nodemon', '--exec', 'node -r ./src/dev-open-in-editor.js', 'src/app.js'];

const child = spawn(nodemonBin, args, {
  stdio: 'inherit',
  shell: false,
  env: process.env,
  cwd: path.join(__dirname, '..')
});

child.on('exit', (code) => process.exit(code ?? 0));
// --- inject /inspector.js into index.html during dev (ENABLE_INSPECTOR) ---
const fs = require('fs');
const adminIndex = path.join(__dirname, '..', '..', 'admin-frontend', 'index.html');
const bak = adminIndex + '.__bak_inspector';

function ensureInjected() {
  try {
    if (!fs.existsSync(adminIndex)) return;
    const src = fs.readFileSync(adminIndex, 'utf8');
    if (src.includes('/inspector.js')) return;
    const injected = src.replace(/<\/body>/i, '<script>\n(function(){try{var p=new URLSearchParams(location.search);if(!p.has("inspector")||p.get("inspector")!=="0"){var s=document.createElement("script");s.src="/inspector.js";document.head.appendChild(s);}}catch(e){}})();\n</script></body>');
    fs.writeFileSync(bak, src, 'utf8');
    fs.writeFileSync(adminIndex, injected, 'utf8');
    console.log('[dev:inspector] injected /inspector.js into index.html (backup saved)');
  } catch (e) {
    console.warn('[dev:inspector] inject failed:', e.message);
  }
}

function restoreIndex() {
  try {
    if (fs.existsSync(bak)) {
      fs.copyFileSync(bak, adminIndex);
      fs.unlinkSync(bak);
      console.log('[dev:inspector] restored original index.html');
    }
  } catch (e) {
    console.warn('[dev:inspector] restore failed:', e.message);
  }
}

if (process.env.ENABLE_INSPECTOR === '1' || String(process.env.ENABLE_INSPECTOR).toLowerCase() === 'true') {
  ensureInjected();
  process.on('exit', restoreIndex);
  process.on('SIGINT', () => { restoreIndex(); process.exit(0); });
  process.on('SIGTERM', () => { restoreIndex(); process.exit(0); });
}
// --- end inject helper ---

