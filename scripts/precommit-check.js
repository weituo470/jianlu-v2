const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ADMIN_ROOT = path.join(ROOT, 'admin-frontend');

const jsFiles = [];
const htmlFiles = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full);
    } else if (stat.isFile()) {
      const ext = path.extname(entry).toLowerCase();
      if (ext === '.js') {
        jsFiles.push(full);
      } else if (ext === '.html') {
        htmlFiles.push(full);
      }
    }
  }
}

walk(ADMIN_ROOT);

const BROKEN_TAG = /(?:\uFFFD|\?)[\s]*\/[a-zA-Z]/;
const errors = [];

function report(file, message) {
  const rel = path.relative(ROOT, file);
  errors.push('[' + rel + '] ' + message);
}

for (const file of jsFiles) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('\uFFFD')) {
    report(file, 'contains replacement character (possible encoding corruption)');
  }
  if (BROKEN_TAG.test(content)) {
    report(file, 'contains broken tag sequence (e.g., ?/span>)');
  }
  try {
    new Function(content);
  } catch (err) {
    const msg = err && err.message ? err.message.split('\n')[0] : 'unknown error';
    report(file, 'syntax error: ' + msg);
  }
}

for (const file of htmlFiles) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('\uFFFD')) {
    report(file, 'contains replacement character (possible encoding corruption)');
  }
  if (BROKEN_TAG.test(content)) {
    report(file, 'contains broken tag sequence (e.g., ?/span>)');
  }
}

if (errors.length) {
  console.error('Pre-commit check failed:');
  errors.forEach(e => console.error('  - ' + e));
  process.exitCode = 1;
} else {
  console.log('Pre-commit check passed.');
}
