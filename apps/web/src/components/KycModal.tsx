'use client';

import { useTranslations } from 'next-intl';
import { useKycModal } from '@/contexts/KycModalContext';
import { KycOverlay } from '@/components/KycOverlay';
import { KycFormContent } from '@/components/KycFormContent';

export function KycModal() {
  const { isOpen, close, kycRequired } = useKycModal();
  const t = useTranslations('kyc');

  return (
    <KycOverlay open={isOpen} onClose={close} aria-label={t('title')}>
      <KycFormContent
        embedded
        kycRequired={kycRequired}
        onClose={close}
        onSuccess={close}
      />
    </KycOverlay>
  );
}
