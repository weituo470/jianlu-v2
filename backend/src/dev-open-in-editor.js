// Dev helper: open files in editor & maintain inspector dev-map (only in dev)
try {
  const child_process = require('child_process');
  const path = require('path');
  const fs = require('fs');
  const app = require('./app');

  if (!app || typeof app.get !== 'function') {
    console.warn('[dev-open-in-editor] app not found, route not installed');
    return;
  }

  app.get('/__open-in-editor', (req, res) => {
    const file = req.query.file;
    if (!file || typeof file !== 'string') {
      return res.status(400).send('Missing file');
    }
    const p = file.replace(/\//g, path.sep);
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

  const enableInspector = String(process.env.ENABLE_INSPECTOR || '').toLowerCase();
  if (!['1', 'true', 'yes'].includes(enableInspector)) {
    return;
  }

  const nodeEnv = String(process.env.NODE_ENV || '').toLowerCase();
  if (nodeEnv && nodeEnv !== 'development') {
    console.log('[dev-open-in-editor] dev-map disabled for NODE_ENV=' + nodeEnv);
    return;
  }

  const mapPath = path.join(__dirname, '../../.dev/dev-map.json');
  const ensureDir = () => {
    const dir = path.dirname(mapPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  };
  const readMap = () => {
    try {
      return JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    } catch (_) {
      return {};
    }
  };

  ensureDir();

  app.get('/__dev-map', (req, res) => {
    try {
      res.json(readMap());
    } catch (e) {
      res.status(500).json({ error: 'read failed' });
    }
  });

  app.post('/__dev-map', (req, res) => {
    try {
      const body = req.body || {};
      const key = String(body.key || '').trim();
      const file = String(body.file || '').trim();
      if (!key || !file) {
        return res.status(400).json({ error: 'key and file required' });
      }
      const map = readMap();
      map[key] = file;
      fs.writeFileSync(mapPath, JSON.stringify(map, null, 2), 'utf8');
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: 'write failed' });
    }
  });
  console.log('[dev-open-in-editor] dev-map routes: GET/POST /__dev-map');
} catch (e) {
  console.warn('[dev-open-in-editor] initialization error:', e.message);
}
