'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { getToken } from '@/lib/api';

/**
 * Redirects to login with redirect param if the user is not authenticated.
 * Use on pages that require a logged-in user (bookings, messages, favoris, checkout).
 * @returns { ready: true } when the user has a token (redirect already done if not)
 */
export function useRequireAuth(): { ready: boolean } {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      const pathWithoutLocale = pathname?.replace(new RegExp(`^/${locale}`), '') || '/';
      router.replace(`/${locale}/login?redirect=${encodeURIComponent(pathWithoutLocale)}`);
      return;
    }
    setReady(true);
  }, [router, pathname, locale]);

  return { ready };
}
