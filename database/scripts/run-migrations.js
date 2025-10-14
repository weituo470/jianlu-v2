#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const mysql = require('mysql2/promise');

const ROOT_DIR = path.join(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT_DIR, 'migrations.json');
const ENV_PATH = path.join(ROOT_DIR, '.env');

function loadEnvFile() {
  if (!fs.existsSync(ENV_PATH)) {
    return;
  }
  const content = fs.readFileSync(ENV_PATH, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) return;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  });
}

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`Migration manifest not found at ${MANIFEST_PATH}`);
  }
  const raw = fs.readFileSync(MANIFEST_PATH, 'utf8');
  return JSON.parse(raw);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    list: false,
    all: false,
    dryRun: false,
    help: false,
    groups: [],
    overrides: {}
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--list' || arg === '-l') {
      options.list = true;
    } else if (arg === '--all') {
      options.all = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--group' || arg === '-g') {
      const value = args[i + 1];
      if (!value) {
        throw new Error('Missing value for --group option');
      }
      options.groups.push(...value.split(',').map((item) => item.trim()).filter(Boolean));
      i += 1;
    } else if (arg.startsWith('--group=')) {
      const value = arg.split('=')[1];
      if (value) {
        options.groups.push(...value.split(',').map((item) => item.trim()).filter(Boolean));
      }
    } else if (arg.startsWith('--host=')) {
      options.overrides.host = arg.split('=')[1];
    } else if (arg.startsWith('--port=')) {
      const portValue = parseInt(arg.split('=')[1], 10);
      if (!Number.isNaN(portValue)) {
        options.overrides.port = portValue;
      }
    } else if (arg.startsWith('--user=')) {
      options.overrides.user = arg.split('=')[1];
    } else if (arg.startsWith('--password=')) {
      options.overrides.password = arg.split('=')[1];
    } else if (arg.startsWith('--database=')) {
      options.overrides.database = arg.split('=')[1];
    } else {
      console.warn(`[warn] Ignoring unknown argument: ${arg}`);
    }
  }

  options.groups = Array.from(new Set(options.groups));
  return options;
}

function printHelp(manifest) {
  console.log(`Usage: npm run migrate [-- <options>]
Options:
  --list, -l          List available migration groups and exit
  --all               Run every group defined in migrations.json
  --group, -g <ids>   Comma separated group ids to run (overrides defaults)
  --dry-run           Print the execution plan without applying changes
  --host=VALUE        Override DB host (defaults to DB_HOST/.env)
  --port=VALUE        Override DB port (defaults to DB_PORT/.env)
  --user=VALUE        Override DB user (defaults to DB_USER/.env)
  --password=VALUE    Override DB password (defaults to DB_PASSWORD/.env)
  --database=VALUE    Override DB name (defaults to DB_NAME/.env)
  --help, -h          Show this help message
`);
  if (manifest) {
    printGroups(manifest);
  }
}

function printGroups(manifest) {
  console.log('Available migration groups:\n');
  manifest.groups.forEach((group) => {
    const isDefault = (manifest.defaultGroups || []).includes(group.id);
    const flag = isDefault ? '[default]' : (group.optional ? '[optional]' : '[manual]');
    console.log(`- ${group.id} ${flag}`);
    console.log(`  ${group.title}`);
    if (group.description) {
      console.log(`  ${group.description}`);
    }
    group.entries.forEach((entry) => {
      console.log(`    • (${entry.type}) ${entry.file}${entry.description ? ` — ${entry.description}` : ''}`);
    });
    console.log('');
  });
}

function resolveGroups(manifest, options) {
  const order = manifest.groups.map((group) => group.id);
  const byId = new Map(manifest.groups.map((group) => [group.id, group]));

  const requested = options.all
    ? order
    : (options.groups.length ? options.groups : (manifest.defaultGroups || []));

  const unknown = requested.filter((id) => !byId.has(id));
  if (unknown.length) {
    throw new Error(`Unknown group id(s): ${unknown.join(', ')}`);
  }

  const uniqueRequested = Array.from(new Set(requested));
  return order
    .filter((id) => uniqueRequested.includes(id))
    .map((id) => byId.get(id));
}

function buildPlan(groups) {
  const seen = new Set();
  const steps = [];
  groups.forEach((group) => {
    group.entries.forEach((entry) => {
      const key = `${entry.type}:${entry.file}`;
      if (seen.has(key)) {
        console.warn(`[warn] Skipping duplicate entry ${entry.file} (already scheduled earlier)`);
        return;
      }
      seen.add(key);
      steps.push({ group: group.id, entry });
    });
  });
  return steps;
}

function loadDbConfig(overrides = {}) {
  const cfg = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'jianlu_admin'
  };
  return { ...cfg, ...overrides };
}

async function runSqlStep(connection, entry, fullPath) {
  const sql = fs.readFileSync(fullPath, 'utf8');
  await connection.query(sql);
}

async function runJsStep(entry, fullPath) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [fullPath], {
      stdio: 'inherit',
      cwd: ROOT_DIR,
      env: process.env
    });
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${entry.file} exited with code ${code}`));
      }
    });
    child.on('error', reject);
  });
}

async function applyPlan(plan, options, dbConfig) {
  const needsSql = plan.some(({ entry }) => entry.type === 'sql');
  let connection = null;
  try {
    if (needsSql && !options.dryRun) {
      connection = await mysql.createConnection({
        ...dbConfig,
        multipleStatements: true
      });
    }

    for (const step of plan) {
      const { entry, group } = step;
      const fullPath = path.join(ROOT_DIR, entry.file);
      if (!fs.existsSync(fullPath)) {
        throw new Error(`File not found: ${entry.file}`);
      }
      const label = `[${group}] ${entry.file}`;
      if (options.dryRun) {
        console.log(`DRY RUN → ${label}`);
        continue;
      }
      const startedAt = Date.now();
      process.stdout.write(`→ ${label} ... `);
      if (entry.type === 'sql') {
        await runSqlStep(connection, entry, fullPath);
      } else if (entry.type === 'js') {
        await runJsStep(entry, fullPath);
      } else {
        throw new Error(`Unsupported entry type: ${entry.type}`);
      }
      const elapsed = Date.now() - startedAt;
      console.log(`done (${elapsed} ms)`);
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function main() {
  loadEnvFile();
  const manifest = loadManifest();
  const options = parseArgs();

  if (options.help) {
    printHelp(manifest);
    return;
  }

  if (options.list) {
    printGroups(manifest);
    return;
  }

  const groups = resolveGroups(manifest, options);
  if (!groups.length) {
    console.log('No migration groups selected. Use --list to inspect available groups.');
    return;
  }

  const plan = buildPlan(groups);
  if (!plan.length) {
    console.log('Selected groups contain no entries. Nothing to do.');
    return;
  }

  console.log('Migration plan:');
  plan.forEach(({ group, entry }) => {
    console.log(` - [${group}] ${entry.file}`);
  });
  console.log('');

  const dbConfig = loadDbConfig(options.overrides);
  if (options.dryRun) {
    console.log('Dry run mode: no statements executed.');
    return;
  }

  console.log(`Using database ${dbConfig.database} on ${dbConfig.host}:${dbConfig.port} as ${dbConfig.user}`);
  await applyPlan(plan, options, dbConfig);
  console.log('\n✅ Migration completed successfully.');
}

main().catch((error) => {
  console.error('\n❌ Migration failed:', error.message || error);
  if (process.env.DEBUG) {
    console.error(error);
  }
  process.exit(1);
});
