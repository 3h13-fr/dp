/**
 * Normalize string for slug: lowercase, trim, replace spaces/special chars with dashes.
 * Used for make/model slugs and deduplication.
 */
export function normalizeForSlug(s: string): string {
  if (!s || typeof s !== 'string') return '';
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '') // strip accents
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Same as normalizeForSlug but used for alias matching (no collapse of multiple dashes needed).
 */
export function normalizedAlias(s: string): string {
  if (!s || typeof s !== 'string') return '';
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[\s_]+/g, ' ')
    .trim();
}
