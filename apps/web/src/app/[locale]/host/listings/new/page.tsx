'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { NewListingPopup } from '@/components/host/NewListingPopup';

export default function NewListingPage() {
  const router = useRouter();
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    // Utiliser setTimeout pour éviter les problèmes de navigation pendant le render
    setTimeout(() => {
      router.push(`/${locale}/host/listings`);
    }, 0);
  }, [router, locale]);

  return <NewListingPopup open={isOpen} onClose={handleClose} />;
}
