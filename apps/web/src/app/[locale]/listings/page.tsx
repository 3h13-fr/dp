'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';

export default function ListingsIndexPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || 'en';
  const q = searchParams.get('q') ?? '';
  const city = searchParams.get('city') ?? q;

  useEffect(() => {
    const rest = new URLSearchParams();
    if (city?.trim()) rest.set('city', city.trim());
    const query = rest.toString();
    // Redirect to /listings/location which will then redirect to /location
    router.replace(`/${locale}/listings/location${query ? `?${query}` : ''}`);
  }, [locale, city, router]);

  return null;
}
