import { notFound } from 'next/navigation';
import { LocationDetailContent } from '@/components/listings/LocationDetailContent';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function getListing(slug: string) {
  const res = await fetch(`${API_URL}/listings/${slug}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  return res.json();
}

async function getSimilarListings(city: string | null, excludeId: string) {
  if (!city) return { items: [] };
  const res = await fetch(
    `${API_URL}/listings?type=CAR_RENTAL&city=${encodeURIComponent(city)}&limit=4`,
    { next: { revalidate: 60 } },
  );
  if (!res.ok) return { items: [] };
  const data = await res.json();
  const items = (data.items ?? []).filter((l: { id: string }) => l.id !== excludeId);
  return { items };
}

export default async function LocationDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const listing = await getListing(slug);
  if (!listing) notFound();
  if (listing.type !== 'CAR_RENTAL') notFound();
  const { items: similarListings } = await getSimilarListings(listing.city ?? null, listing.id);
  return (
    <LocationDetailContent listing={listing} similarListings={similarListings} vertical="location" />
  );
}
