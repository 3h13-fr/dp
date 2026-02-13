'use client';

import { useSearchParams } from 'next/navigation';
import { KycFormContent } from '@/components/KycFormContent';

export default function KycPage() {
  const searchParams = useSearchParams();
  const kycRequired = searchParams.get('kyc') === 'required';

  return (
    <div className="min-h-[60vh] bg-white pb-24 md:pb-8">
      <div className="mx-auto max-w-lg px-4 py-8">
        <KycFormContent kycRequired={kycRequired} embedded={false} />
      </div>
    </div>
  );
}
