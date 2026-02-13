'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { AuthModalProvider } from '@/contexts/AuthModalContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { KycModalProvider } from '@/contexts/KycModalContext';
import { KycModal } from '@/components/KycModal';

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHostArea = pathname?.includes('/host') ?? false;

  // Check if we're on a listing detail page (location/[slug] or ride/[slug])
  const isListingDetailPage =
    pathname?.match(/\/[a-z]{2}\/(location|ride)\/[^/]+$/) !== null;

  const showBottomNav = !isListingDetailPage;

  // #region agent log
  useEffect(() => {
    // Désactiver les appels analytics en développement pour éviter les erreurs dans la console
    if (process.env.NODE_ENV === 'production') {
      fetch('http://127.0.0.1:7242/ingest/d4d80e1e-130a-4236-9b97-782fd171848c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LayoutShell.tsx',message:'LayoutShell mounted',data:{pathname,isHostArea,isListingDetailPage,showingHeader:!isHostArea && !isListingDetailPage},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
    }
  }, [pathname, isHostArea, isListingDetailPage]);
  // #endregion

  return (
    <KycModalProvider>
      <KycModal />
      {isHostArea ? (
        <>{children}</>
      ) : (
        <AuthModalProvider>
          {/* Hide Header on mobile for listing detail pages, keep visible on desktop */}
          <div className={isListingDetailPage ? 'hidden md:block' : ''}>
            <Header />
          </div>
          <main className={showBottomNav ? 'pb-16 md:pb-0' : ''}>{children}</main>
          {showBottomNav && <BottomNav />}
          <AuthModal />
        </AuthModalProvider>
      )}
    </KycModalProvider>
  );
}
