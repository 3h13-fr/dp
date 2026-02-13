/**
 * Titre affiché d'un listing : displayTitle (API), nom canonique (véhicule) ou titre legacy.
 */
export function getListingTitle(listing: {
  displayTitle?: string | null;
  title?: string | null;
  displayName?: string | null;
}): string {
  return (listing.displayTitle ?? listing.displayName ?? listing.title ?? '').toString().trim() || '—';
}

/** Maps listing.country (free text) to ISO code. Must match backend COUNTRY_MATCH_TERMS. */
const COUNTRY_TEXT_TO_CODE: Record<string, string> = {
  fr: 'FR',
  france: 'FR',
  french: 'FR',
  be: 'BE',
  belgium: 'BE',
  belgique: 'BE',
  ch: 'CH',
  switzerland: 'CH',
  suisse: 'CH',
  lu: 'LU',
  luxembourg: 'LU',
  de: 'DE',
  germany: 'DE',
  deutschland: 'DE',
  es: 'ES',
  spain: 'ES',
  espagne: 'ES',
  it: 'IT',
  italy: 'IT',
  italie: 'IT',
  nl: 'NL',
  netherlands: 'NL',
  holland: 'NL',
  us: 'US',
  usa: 'US',
  'united states': 'US',
  america: 'US',
  en: 'GB',
  uk: 'GB',
  england: 'GB',
  'united kingdom': 'GB',
};

export function getListingCountryCode(listing: {
  country?: string | null;
  cityRef?: { country?: { code?: string } } | null;
}): string | null {
  const code = listing.cityRef?.country?.code?.trim();
  if (code) return code.toUpperCase();
  const raw = listing.country?.trim();
  if (!raw) return null;
  const normalized = raw.toLowerCase();
  return COUNTRY_TEXT_TO_CODE[normalized] ?? null;
}
