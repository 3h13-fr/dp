'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';

export default function ListingsChauffeurRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || 'en';

  useEffect(() => {
    const query = searchParams.toString();
    router.replace(`/${locale}/ride${query ? `?${query}` : ''}`);
  }, [locale, searchParams, router]);

  return null;
}
