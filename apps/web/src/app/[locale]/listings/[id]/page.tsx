import { notFound } from 'next/navigation';
import { ListingDetail } from '@/components/listings/ListingDetail';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function getListing(id: string) {
  const res = await fetch(`${API_URL}/listings/${id}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function ListingPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) notFound();
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <ListingDetail listing={listing} />
    </div>
  );
}
