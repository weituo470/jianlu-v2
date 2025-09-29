#!/usr/bin/env node
// Cross-platform dev:inspector runner
const { spawn } = require('child_process');
const path = require('path');

// Ensure env var is set
process.env.ENABLE_INSPECTOR = process.env.ENABLE_INSPECTOR || '1';
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const nodemonBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const args = ['nodemon', 'src/app.js'];

const child = spawn(nodemonBin, args, {
  stdio: 'inherit',
  shell: false,
  env: process.env,
  cwd: path.join(__dirname, '..')
});

child.on('exit', (code) => process.exit(code ?? 0));
