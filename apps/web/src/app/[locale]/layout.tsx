import type { AbstractIntlMessages } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { ClientIntlProvider } from '@/components/ClientIntlProvider';
import { LayoutShell } from '@/components/LayoutShell';

// Avoid prerender: NextIntlClientProvider/IntlProvider hits "useMemo of null" during SSG in pnpm monorepo
export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isValidLocale = locale && routing.locales.includes(locale as 'en' | 'fr');
  if (!isValidLocale) {
    notFound();
  }
  // Load messages directly to avoid getMessages/setRequestLocale from externalized next-intl/server (RSC context issues in pnpm)
  const messages = (await import(`../../../messages/${locale}.json`)).default as AbstractIntlMessages;
  // #region agent log
  // Désactiver les appels analytics en développement pour éviter les erreurs dans la console
  if (process.env.NODE_ENV === 'production') {
    const LOG_PATH = '/tmp/dp-layout-debug.log';
    try {
      const fs = await import('fs');
      const logLine = JSON.stringify({location:'[locale]/layout.tsx',message:'locale layout rendering',data:{locale,hasMessages:!!messages},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'}) + '\n';
      fs.appendFileSync(LOG_PATH, logLine);
    } catch (_) {}
    fetch('http://127.0.0.1:7242/ingest/d4d80e1e-130a-4236-9b97-782fd171848c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'[locale]/layout.tsx',message:'locale layout rendering',data:{locale,hasMessages:!!messages},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
  }
  // #endregion
  return (
    <ClientIntlProvider locale={locale} messages={messages ?? {}}>
      <LayoutShell>{children}</LayoutShell>
    </ClientIntlProvider>
  );
}
