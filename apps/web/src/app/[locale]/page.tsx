'use client';

import { HomeListingsGrid } from '@/components/home/HomeListingsGrid';

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-white">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <section>
          <HomeListingsGrid />
        </section>
      </div>
    </div>
  );
}
