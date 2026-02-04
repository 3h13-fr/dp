'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NotFound() {
  const pathname = usePathname();
  const locale = pathname?.split('/')[1] ?? 'en';
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <h1 className="text-2xl font-bold text-foreground">404</h1>
      <p className="mt-2 text-muted-foreground">This page could not be found.</p>
      <Link
        href={`/${locale}`}
        className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Go home
      </Link>
    </div>
  );
}
