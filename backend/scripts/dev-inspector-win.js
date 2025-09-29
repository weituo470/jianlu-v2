#!/usr/bin/env node
// Windows-friendly dev:inspector runner using cmd.exe /c npx
const { spawn } = require('child_process');
const path = require('path');

process.env.ENABLE_INSPECTOR = process.env.ENABLE_INSPECTOR || '1';
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const cmd = process.env.ComSpec || 'cmd.exe';
const args = ['/c', 'npx', 'nodemon', '--exec', 'node -r ./src/dev-open-in-editor.js', 'src/app.js'];

const child = spawn(cmd, args, {
  stdio: 'inherit',
  shell: false,
  env: process.env,
  cwd: path.join(__dirname, '..')
});

child.on('exit', (code) => process.exit(code ?? 0));
