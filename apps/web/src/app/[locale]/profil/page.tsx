'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { getToken, apiFetch } from '@/lib/api';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function ProfilPage() {
  const t = useTranslations('profil');
  const tKyc = useTranslations('kyc');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const kycRequired = searchParams.get('kyc') === 'required';
  const [isLoggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const prefix = `/${locale}`;

  useEffect(() => {
    const token = getToken();
    setLoggedIn(!!token);
    if (!token) {
      setRole(null);
      setKycStatus(null);
      return;
    }
    const stored = localStorage.getItem('user_role');
    if (stored) setRole(stored);
    apiFetch('/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((user) => {
        if (user?.role) {
          localStorage.setItem('user_role', user.role);
          setRole(user.role);
        } else if (!stored) setRole(null);
        setKycStatus(user?.kycStatus ?? null);
      })
      .catch(() => setKycStatus(null));
  }, []);

  const linkClass = 'flex items-center gap-3 py-3 text-neutral-800 hover:text-black';
  const iconClass = 'h-5 w-5 shrink-0 text-neutral-500';
  const sectionTitle = 'mb-2 text-sm font-bold text-black';

  return (
    <div className="min-h-[60vh] bg-white pb-24 md:pb-8">
      <div className="mx-auto max-w-lg px-4 py-8">
        <h1 className="text-2xl font-bold text-black">{t('title')}</h1>

        {!isLoggedIn && (
          <div className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 p-6">
            <p className="text-neutral-700">{t('connectToStart')}</p>
            <Link
              href={`${prefix}/login`}
              className="mt-4 block w-full rounded-lg bg-neutral-800 py-3 text-center font-medium text-white hover:bg-neutral-900"
            >
              {tCommon('login')}
            </Link>
            <p className="mt-4 text-center text-sm text-neutral-600">
              {t('noAccount')}{' '}
              <Link href={`${prefix}/login`} className="font-medium text-neutral-900 underline">
                {tCommon('signup')}
              </Link>
            </p>
          </div>
        )}

        {isLoggedIn && kycStatus !== 'APPROVED' && (
          <section className="mt-6">
            <div
              className={`rounded-xl border p-6 ${
                kycRequired
                  ? 'border-amber-300 bg-amber-50'
                  : 'border-neutral-200 bg-neutral-50'
              }`}
            >
              {kycRequired && <p className="mb-2 font-medium text-amber-800">{tKyc('kycRequired')}</p>}
              {kycStatus === 'PENDING' && <p className="text-neutral-700">{tKyc('statusPending')}</p>}
              {kycStatus === 'PENDING_REVIEW' && <p className="text-neutral-700">{tKyc('statusPendingReview')}</p>}
              {(!kycStatus || kycStatus === 'REJECTED') && (
                <p className="text-neutral-700">{tKyc('verifyIdentity')}</p>
              )}
              {(kycStatus === 'PENDING' || kycStatus === 'PENDING_REVIEW') && (
                <p className="mt-1 text-sm text-neutral-500">{tKyc('subtitle')}</p>
              )}
              {(!kycStatus || kycStatus === 'REJECTED' || kycRequired) && (
                <Link
                  href={`${prefix}/profil/kyc${kycRequired ? '?kyc=required' : ''}`}
                  className="mt-4 block w-full rounded-lg bg-neutral-800 py-3 text-center font-medium text-white hover:bg-neutral-900"
                >
                  {tKyc('goToKyc')}
                </Link>
              )}
            </div>
          </section>
        )}

        <section className="mt-8" id="owner">
          <h2 className={sectionTitle}>{t('owner')}</h2>
          {isLoggedIn && role === 'HOST' && (
            <Link
              href={`${prefix}/host`}
              className="mb-3 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 py-4 px-4 text-primary hover:bg-primary/10"
              onClick={() => {
                try {
                  localStorage.setItem('view_mode', 'host');
                } catch {
                  /* ignore */
                }
              }}
            >
              <svg className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="font-medium">{t('accessPartnerDashboard')}</span>
              <svg className="ml-auto h-5 w-5 text-primary/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
          <Link href={`${prefix}/host`} className={linkClass}>
            <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <span>{t('rentMyVehicles')}</span>
            <svg className="ml-auto h-5 w-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </section>

        <section className="mt-8" id="assistance">
          <h2 className={sectionTitle}>{t('assistance')}</h2>
          <div className="space-y-0">
            <Link href="#how" className={linkClass}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{t('howItWorks')}</span>
              <svg className="ml-auto h-5 w-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link href="#" className={linkClass}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>{t('visitHelpCenter')}</span>
              <svg className="ml-auto h-5 w-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link href="#" className={linkClass}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 7a7 7 0 01-7-7V7a7 7 0 0114 0v5a7 7 0 01-7 7z" />
              </svg>
              <span>{t('assistanceDrivePark')}</span>
              <svg className="ml-auto h-5 w-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </section>

        <section className="mt-8">
          <h2 className={sectionTitle}>{t('social')}</h2>
          <div className="space-y-0">
            <a href="#" className={linkClass}>
              <span className={iconClass}>📷</span>
              <span>{t('followInstagram')}</span>
              <svg className="ml-auto h-5 w-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
            <a href="#" className={linkClass}>
              <span className={iconClass}>in</span>
              <span>{t('followLinkedIn')}</span>
              <svg className="ml-auto h-5 w-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
            <a href="#" className={linkClass}>
              <span className={iconClass}>𝕏</span>
              <span>{t('followTwitter')}</span>
              <svg className="ml-auto h-5 w-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </section>

        <section className="mt-8">
          <h2 className={sectionTitle}>{t('legal')}</h2>
          <div className="space-y-0">
            <Link href="#" className={linkClass}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>{t('terms')}</span>
              <svg className="ml-auto h-5 w-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link href="#" className={linkClass}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>{t('privacy')}</span>
              <svg className="ml-auto h-5 w-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link href="#" className={linkClass}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>{t('legalNotice')}</span>
              <svg className="ml-auto h-5 w-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </section>

        <section className="mt-8" id="how">
          <h2 className={sectionTitle}>{t('languageAndCurrency')}</h2>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3">
              <span className="flex items-center gap-2">
                <span className="text-lg">🇫🇷</span>
                {t('french')}
              </span>
              <svg className="h-5 w-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3">
              <span>{t('eur')}</span>
              <svg className="h-5 w-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </section>

        <footer className="mt-12 border-t border-neutral-200 pt-8 text-center text-sm text-neutral-500">
          <p>{t('copyright')}</p>
          <div className="mt-4 flex justify-center gap-4">
            <a href="#" className="text-neutral-400 hover:text-neutral-600" aria-label="Facebook">f</a>
            <a href="#" className="text-neutral-400 hover:text-neutral-600" aria-label="Instagram">📷</a>
            <a href="#" className="text-neutral-400 hover:text-neutral-600" aria-label="Snapchat">S</a>
            <a href="#" className="text-neutral-400 hover:text-neutral-600" aria-label="TikTok">♪</a>
            <a href="#" className="text-neutral-400 hover:text-neutral-600" aria-label="LinkedIn">in</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
