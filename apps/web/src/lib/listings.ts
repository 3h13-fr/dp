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
