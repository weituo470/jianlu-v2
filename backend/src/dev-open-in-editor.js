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
    // Dev map (read/write) for inspector
    try {
      const mapPath = require('path').join(__dirname, '../../admin-frontend/dev-map.json');
      const ensureMap = () => { try { return JSON.parse(require('fs').readFileSync(mapPath, 'utf8')); } catch (_) { return {}; } };
      app.get('/__dev-map', (req, res) => { try { res.json(ensureMap()); } catch(e){ res.status(500).json({error:'read failed'}); } });
      app.post('/__dev-map', (req, res) => {
        try {
          const body = req.body || {}; const key = String(body.key||'').trim(); const file = String(body.file||'').trim();
          if (!key || !file) return res.status(400).json({error:'key and file required'});
          const map = ensureMap(); map[key] = file;
          require('fs').writeFileSync(mapPath, JSON.stringify(map, null, 2), 'utf8');
          res.json({ok:true});
        } catch(e){ res.status(500).json({error:'write failed'}); }
      });
      console.log('[dev-open-in-editor] dev-map routes: GET/POST /__dev-map');
    } catch (e) { console.warn('[dev-open-in-editor] dev-map disabled:', e.message); }
