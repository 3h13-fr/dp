#!/usr/bin/env node
/**
 * Reset test DB: migrate + seed.
 * Uses .env.test if present (and has DATABASE_URL), otherwise .env.
 * Run from repo root.
 */

import { spawnSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());
const envTest = resolve(root, '.env.test');
const envDefault = resolve(root, '.env');

function loadEnv(path) {
  if (!existsSync(path)) return {};
  const text = readFileSync(path, 'utf8');
  const out = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) {
      const key = m[1];
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
        val = val.slice(1, -1).replace(/\\n/g, '\n');
      out[key] = val;
    }
  }
  return out;
}

const env = { ...process.env, ...loadEnv(envDefault) };
if (existsSync(envTest)) {
  const testVars = loadEnv(envTest);
  if (testVars.DATABASE_URL) {
    Object.assign(env, testVars);
    console.log('Using .env.test for DATABASE_URL');
  }
}
if (!env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Create .env.test (or .env) with DATABASE_URL.');
  process.exit(1);
}

function run(name, args) {
  const r = spawnSync('pnpm', ['--filter', 'database', name, ...args], {
    cwd: root,
    env,
    stdio: 'inherit',
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run('migrate:deploy', []);
run('db:seed', []);
