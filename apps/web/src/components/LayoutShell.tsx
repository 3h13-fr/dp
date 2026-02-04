'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHostArea = pathname?.includes('/host') ?? false;

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
