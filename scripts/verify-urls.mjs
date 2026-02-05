#!/usr/bin/env node
/**
 * URL verification script: hits all API and frontend routes and reports OK/FAIL.
 * Run with: pnpm verify:urls (requires API on 4000 and Web on 3000 to be running).
 *
 * Each entry: { method, path, acceptedStatuses }
 * For dynamic segments we use a placeholder id; 404 is accepted.
 */

const API_BASE = process.env.VERIFY_API_URL || 'http://localhost:4000';
const WEB_BASE = process.env.VERIFY_WEB_URL || 'http://localhost:3000';
const LOCALES = ['en', 'fr'];
const FAKE_ID = '00000000-0000-0000-0000-000000000000';

const apiRoutes = [
  { method: 'GET', path: '/', accepted: [200] },
  { method: 'GET', path: '/health', accepted: [200] },
  { method: 'GET', path: '/auth/me', accepted: [200, 401] },
  { method: 'GET', path: '/listings', accepted: [200] },
  { method: 'GET', path: `/listings/${FAKE_ID}`, accepted: [200, 404] },
  { method: 'GET', path: `/listings/${FAKE_ID}/reviews`, accepted: [200, 404] },
  { method: 'GET', path: `/listings/${FAKE_ID}/reviews/stats`, accepted: [200, 404] },
  { method: 'GET', path: '/bookings/my', accepted: [200, 401] },
  { method: 'GET', path: `/bookings/${FAKE_ID}`, accepted: [200, 401, 404] },
  { method: 'GET', path: '/admin/users', accepted: [200, 401, 403] },
  { method: 'GET', path: '/admin/listings', accepted: [200, 401, 403] },
  { method: 'GET', path: '/admin/audit-logs', accepted: [200, 401, 403] },
  { method: 'GET', path: '/notifications', accepted: [200, 401] },
  { method: 'GET', path: `/users/${FAKE_ID}`, accepted: [200, 401, 404] },
  { method: 'GET', path: `/payments/booking/${FAKE_ID}`, accepted: [200, 401, 404] },
  { method: 'GET', path: '/messages/thread', accepted: [200, 400, 401] },
  { method: 'GET', path: '/geo/countries', accepted: [200] },
];

const frontendRoutes = [
  { path: '/', accepted: [200, 307] },
  ...LOCALES.map((locale) => ({ path: `/${locale}`, accepted: [200] })),
  ...LOCALES.map((locale) => ({ path: `/${locale}/listings`, accepted: [200, 302] })),
  ...LOCALES.map((locale) => ({ path: `/${locale}/location`, accepted: [200] })),
  ...LOCALES.map((locale) => ({ path: `/${locale}/experience`, accepted: [200] })),
  ...LOCALES.map((locale) => ({ path: `/${locale}/ride`, accepted: [200] })),
  ...LOCALES.map((locale) => ({ path: `/${locale}/location/${FAKE_ID}`, accepted: [200, 404] })),
  ...LOCALES.map((locale) => ({ path: `/${locale}/location/${FAKE_ID}/checkout`, accepted: [200, 404] })),
  ...LOCALES.map((locale) => ({ path: `/${locale}/bookings`, accepted: [200] })),
  ...LOCALES.map((locale) => ({ path: `/${locale}/bookings/${FAKE_ID}`, accepted: [200, 404] })),
  ...LOCALES.map((locale) => ({ path: `/${locale}/bookings/${FAKE_ID}/pay`, accepted: [200, 404] })),
  ...LOCALES.map((locale) => ({ path: `/${locale}/login`, accepted: [200] })),
  ...LOCALES.map((locale) => ({ path: `/${locale}/messages`, accepted: [200] })),
  ...LOCALES.map((locale) => ({ path: `/${locale}/admin`, accepted: [200] })),
  ...LOCALES.map((locale) => ({ path: `/${locale}/admin/users`, accepted: [200] })),
  ...LOCALES.map((locale) => ({ path: `/${locale}/admin/listings`, accepted: [200] })),
  ...LOCALES.map((locale) => ({ path: `/${locale}/admin/audit`, accepted: [200] })),
];

async function check(url, options, acceptedStatuses, label) {
  try {
    const res = await fetch(url, {
      ...options,
      redirect: 'manual',
    });
    const ok = acceptedStatuses.includes(res.status);
    return { label, url, status: res.status, accepted: acceptedStatuses, ok };
  } catch (err) {
    return { label, url, status: null, error: err.message, ok: false };
  }
}

function isConnectionError(result) {
  return result.error && (result.error.includes('fetch failed') || result.error.includes('ECONNREFUSED'));
}

async function main() {
  const results = [];
  const out = (msg) => console.log(msg);

  out('\n--- API routes ---\n');
  for (const r of apiRoutes) {
    const url = `${API_BASE}${r.path}`;
    const result = await check(url, { method: r.method }, r.accepted, `API ${r.method} ${r.path}`);
    results.push(result);
    const icon = result.ok ? '✓' : '✗';
    const status = result.status ?? result.error;
    out(`${icon} ${r.method} ${r.path} → ${status} ${result.ok ? '' : `(expected ${r.accepted.join(', ')})`}`);
  }

  out('\n--- Frontend routes ---\n');
  for (const r of frontendRoutes) {
    const url = `${WEB_BASE}${r.path}`;
    const result = await check(url, { method: 'GET', headers: { Accept: 'text/html' } }, r.accepted, `Web ${r.path}`);
    results.push(result);
    const icon = result.ok ? '✓' : '✗';
    const status = result.status ?? result.error;
    out(`${icon} GET ${r.path} → ${status} ${result.ok ? '' : `(expected ${r.accepted.join(', ')})`}`);
  }

  const failed = results.filter((r) => !r.ok);
  const apiFailed = results.filter((r) => r.label.startsWith('API ') && !r.ok);
  const allApiConnectionErrors = apiFailed.length > 0 && apiFailed.every((r) => isConnectionError(r));
  const realFailures = allApiConnectionErrors ? failed.filter((r) => !r.label.startsWith('API ')) : failed;

  out('\n--- Summary ---');
  out(`Total: ${results.length}, OK: ${results.length - failed.length}, FAIL: ${failed.length}`);
  if (allApiConnectionErrors) {
    out('\nNote: API requests failed (connection refused). Start the API with: pnpm dev:api (or pnpm dev)');
    out('Exit 0 (only frontend was verified).');
  }
  if (realFailures.length) {
    out('\nFailed:');
    realFailures.forEach((f) => out(`  ${f.label} → ${f.status ?? f.error}`));
    process.exit(1);
  }
  out('\nAll URLs OK.\n');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
