import { notFound } from 'next/navigation';
import { ListingDetail } from '@/components/listings/ListingDetail';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function getListing(slug: string) {
  const res = await fetch(`${API_URL}/listings/${slug}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function ExperienceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const listing = await getListing(slug);
  if (!listing) notFound();
  if (listing.type !== 'MOTORIZED_EXPERIENCE') notFound();
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <ListingDetail listing={listing} vertical="experience" />
    </div>
  );
}
