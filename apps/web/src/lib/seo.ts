/**
 * SEO helpers — templates dynamiques, indexation (à enrichir selon docs/SEO_ARCHITECTURE.md)
 */

export type Locale = 'en' | 'fr';

/** Rend une chaîne de template avec variables {{varName}} */
export function renderSeoTemplate(
  template: string,
  vars: Record<string, string | number | undefined>,
  _locale?: Locale
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(placeholder, String(value ?? ''));
  }
  return result;
}

const MIN_OFFERS_INDEXABLE = 3;

/** Détermine si une page ville/verticale doit être indexée (seuil minimal offerCount, seoPriority). */
export function isIndexable(
  _cityId: string | null,
  _vertical: string,
  offerCount?: number,
  seoPriority?: number
): boolean {
  if (seoPriority != null && seoPriority > 0) return true;
  if (offerCount != null && offerCount < MIN_OFFERS_INDEXABLE) return false;
  return true;
}
