#!/usr/bin/env node
/**
 * Kill processes listening on ports 3000, 4000 (and optionally 3001, 3002).
 * Run from repo root: pnpm run kill:ports
 */

import { execSync } from 'child_process';

const ports = [4000, 3000, 3001, 3002];

for (const port of ports) {
  try {
    const pid = execSync(`lsof -t -i :${port}`, { encoding: 'utf8' }).trim();
    if (pid) {
      execSync(`kill -9 ${pid}`, { stdio: 'inherit' });
      console.log(`Port ${port} freed (PID ${pid})`);
    }
  } catch {
    // lsof exits with error if no process found - ignore
  }
}
