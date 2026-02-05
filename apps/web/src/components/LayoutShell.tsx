'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHostArea = pathname?.includes('/host') ?? false;

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/d4d80e1e-130a-4236-9b97-782fd171848c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LayoutShell.tsx',message:'LayoutShell mounted',data:{pathname,isHostArea,showingHeader:!isHostArea},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
  }, [pathname, isHostArea]);
  // #endregion

  if (isHostArea) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main className="pb-16 md:pb-0">{children}</main>
      <BottomNav />
    </>
  );
}
