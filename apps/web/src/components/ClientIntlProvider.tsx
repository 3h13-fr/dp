'use client';

import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import { useState, useEffect } from 'react';

/**
 * Wraps NextIntlClientProvider so it only renders after client mount.
 * Avoids "useMemo of null" when use-intl runs in Next.js server/RSC context (pnpm monorepo).
 */
export function ClientIntlProvider({
  locale,
  messages,
  children,
}: {
  locale: string;
  messages: AbstractIntlMessages;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-white" aria-hidden data-testid="intl-loading">
        <div className="mx-auto max-w-6xl px-4 py-6" />
      </div>
    );
  }

  return (
    <div data-testid="intl-ready">
      <NextIntlClientProvider locale={locale} messages={messages ?? {}}>
        {children}
      </NextIntlClientProvider>
    </div>
  );
}
