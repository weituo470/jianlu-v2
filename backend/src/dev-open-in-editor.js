// Lightweight /__open-in-editor route installer (opt-in)
// Usage: node -r ./src/dev-open-in-editor.js src/app.js  (via nodemon --exec)

try {
  const child_process = require('child_process');
  const path = require('path');
  const fs = require('fs');
  const app = require('./app'); // app is already an Express instance

  if (!app || !app.get || typeof app.get !== 'function') {
    console.warn('[dev-open-in-editor] app not found, route not installed');
  } else {
    app.get('/__open-in-editor', (req, res) => {
      const file = req.query.file;
      if (!file || typeof file !== 'string') return res.status(400).send('Missing file');
      // Normalize to OS path
      const p = file.replace(/\//g, path.sep);
      // Support VS Code
      const vscodeCmd = process.platform === 'win32' ? 'code.cmd' : 'code';
      try {
        const cp = child_process.spawn(vscodeCmd, ['-g', p], { stdio: 'ignore', detached: true });
        cp.unref();
        res.status(200).send('OK');
      } catch (e) {
        console.error('[dev-open-in-editor] failed:', e);
        res.status(500).send('Failed');
      }
    });
    console.log('[dev-open-in-editor] route installed at GET /__open-in-editor');
  }
} catch (e) {
  console.warn('[dev-open-in-editor] initialization error:', e.message);
}
