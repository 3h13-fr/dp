#!/usr/bin/env node
/**
 * Debug script: vérifie l'état des vendor-chunks avant dev
 * Log vers /Applications/DP/.cursor/debug.log (NDJSON)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_PATH = '/Applications/DP/.cursor/debug.log';
const VENDOR_PATH = path.join(__dirname, '../.next/server/vendor-chunks');
const EXPECTED_CHUNK = 'next-intl@3.26.5_next@14.2.35_@playwright+test@1.58.1_react-dom@18.3.1_react@18.3.1__react@18.3.1__react@18.3.1.js';

function log(entry) {
  fs.appendFileSync(LOG_PATH, JSON.stringify(entry) + '\n');
}

const vendorExists = fs.existsSync(VENDOR_PATH);
const files = vendorExists ? fs.readdirSync(VENDOR_PATH) : [];
const hasNextIntlChunk = files.some((f) => f.includes('next-intl'));

log({
  timestamp: Date.now(),
  sessionId: 'debug-session',
  hypothesisId: 'A',
  location: 'scripts/debug-chunks.mjs',
  message: 'vendor-chunks state',
  data: {
    vendorPathExists: vendorExists,
    vendorFiles: files,
    hasNextIntlChunk,
    expectedChunk: EXPECTED_CHUNK,
  },
});
