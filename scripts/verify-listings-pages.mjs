#!/usr/bin/env node
/**
 * Vérifie la visite des pages listings et la présence des formulaires de recherche.
 * Utilise fetch + vérification du contenu HTML (pas de navigateur).
 *
 * Prérequis : lancer le front (et l’API si besoin) avant :
 *   pnpm dev
 *
 * Puis (ajuster le port si Next tourne sur 3001) :
 *   pnpm run verify:listings
 *   # ou avec un port explicite :
 *   VERIFY_WEB_URL=http://localhost:3001 pnpm run verify:listings
 */

const WEB_BASE = process.env.VERIFY_WEB_URL || 'http://localhost:3000';
const LOCALES = ['en', 'fr'];

const FETCH_TIMEOUT_MS = 8000;

async function fetchHtml(path, followRedirect = true) {
  const url = `${WEB_BASE}${path}`;
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'text/html' },
      redirect: followRedirect ? 'follow' : 'manual',
      signal: controller.signal,
    });
    const body = await res.text();
    return { status: res.status, body, url: res.url };
  } finally {
    clearTimeout(to);
  }
}

function assertContains(body, strings, label) {
  const missing = strings.filter((s) => !body.includes(s));
  if (missing.length) return { ok: false, label, missing };
  return { ok: true, label };
}

async function main() {
  const out = (msg) => console.log(msg);
  const results = [];

  out('\n--- Accueil : onglets Location / Expérience / Chauffeur ---\n');

  for (const locale of LOCALES) {
    const { status, body } = await fetchHtml(`/${locale}`);
    const okStatus = status === 200;
    results.push({ ok: okStatus, label: `GET /${locale} → ${status}` });
    out(`${okStatus ? '✓' : '✗'} GET /${locale} → ${status}`);

    if (okStatus) {
      const tabCheck = assertContains(body, ['Location', 'Experience', 'Expérience', 'Chauffeur'], 'Onglets');
      if (!tabCheck.ok) {
        results.push({ ok: false, label: `Onglets manquants: ${tabCheck.missing?.join(', ')}` });
        out('  ✗ Contenu: onglets manquants (attendu: Location, Experience/Expérience, Chauffeur)');
      } else {
        results.push(tabCheck);
        out('  ✓ Contenu: onglets présents');
      }
    }
  }

  out('\n--- Redirection /listings → /listings/location ---\n');

  for (const locale of LOCALES) {
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res;
    try {
      res = await fetch(`${WEB_BASE}/${locale}/listings`, {
        method: 'GET',
        headers: { Accept: 'text/html' },
        redirect: 'manual',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(to);
    }
    const isRedirect = res.status === 302 || res.status === 307;
    const location = res.headers.get('location') || '';
    const redirectsToLocation = location.includes('/listings/location');
    const ok = isRedirect && redirectsToLocation;
    results.push({ ok, label: `GET /${locale}/listings → ${res.status} Location: ${location}` });
    out(`${ok ? '✓' : '✗'} GET /${locale}/listings → ${res.status} ${location}`);
  }

  out('\n--- Page Location + formulaire ---\n');

  for (const locale of LOCALES) {
    const { status, body } = await fetchHtml(`/${locale}/listings/location`);
    const okStatus = status === 200;
    results.push({ ok: okStatus, label: `GET /${locale}/listings/location → ${status}` });
    out(okStatus ? '✓' : '✗', `GET /${locale}/listings/location → ${status}`);

    if (okStatus) {
      const hasLocationTitle = body.includes('Location');
      const hasSearchLocationForm =
        body.includes('Start date') ||
        body.includes('Date de début') ||
        body.includes('searchLocation') ||
        body.includes('type="date"');
      const formOk = hasLocationTitle && (hasSearchLocationForm || body.includes('Rechercher') || body.includes('Search'));
      results.push({ ok: formOk, label: 'Formulaire location (dates, lieu)' });
      out(formOk ? '  ✓ Titre + formulaire de recherche présents' : '  ✗ Formulaire ou titre manquant');
    }
  }

  out('\n--- Page Expérience + formulaire ---\n');

  for (const locale of LOCALES) {
    const { status, body } = await fetchHtml(`/${locale}/listings/experience`);
    const okStatus = status === 200;
    results.push({ ok: okStatus, label: `GET /${locale}/listings/experience → ${status}` });
    out(`${okStatus ? '✓' : '✗'} GET /${locale}/listings/experience → ${status}`);

    if (okStatus) {
      const hasExpTitle = body.includes('Experience') || body.includes('Expérience');
      const hasForm = body.includes('type="date"') || body.includes('Rechercher') || body.includes('Search');
      const formOk = hasExpTitle && hasForm;
      results.push({ ok: formOk, label: 'Formulaire expérience' });
      out(formOk ? '  ✓ Titre + formulaire présents' : '  ✗ Formulaire ou titre manquant');
    }
  }

  out('\n--- Page Chauffeur + formulaire ---\n');

  for (const locale of LOCALES) {
    const { status, body } = await fetchHtml(`/${locale}/listings/chauffeur`);
    const okStatus = status === 200;
    results.push({ ok: okStatus, label: `GET /${locale}/listings/chauffeur → ${status}` });
    out(`${okStatus ? '✓' : '✗'} GET /${locale}/listings/chauffeur → ${status}`);

    if (okStatus) {
      const hasChauffeurTitle = body.includes('Chauffeur');
      const hasTimeOrForm =
        body.includes('type="time"') ||
        body.includes('type="date"') ||
        body.includes('Rechercher') ||
        body.includes('Search');
      const formOk = hasChauffeurTitle && hasTimeOrForm;
      results.push({ ok: formOk, label: 'Formulaire chauffeur' });
      out(formOk ? '  ✓ Titre + formulaire (date/heure) présents' : '  ✗ Formulaire ou titre manquant');
    }
  }

  const failed = results.filter((r) => !r.ok);
  out('\n--- Résumé ---');
  out(`Total: ${results.length}, OK: ${results.length - failed.length}, FAIL: ${failed.length}`);
  if (failed.length) {
    out('\nÉchecs:');
    failed.forEach((f) => out(`  ${f.label}`));
    process.exit(1);
  }
  out('\nToutes les pages et formulaires sont OK.\n');
}

main().catch((e) => {
  if (e.name === 'AbortError') {
    console.error('\nDélai dépassé : le serveur ne répond pas.');
    console.error(`Vérifiez que le front tourne (ex: pnpm dev) et que l’URL est correcte: ${WEB_BASE}`);
  } else {
    console.error(e);
  }
  process.exit(1);
});
