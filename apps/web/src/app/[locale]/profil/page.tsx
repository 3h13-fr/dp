'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { getToken, apiFetch } from '@/lib/api';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthModal } from '@/contexts/AuthModalContext';
import { useKycModal } from '@/contexts/KycModalContext';
import { S3Image } from '@/components/S3Image';

interface User {
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  role?: string;
}

export default function ProfilPage() {
  const t = useTranslations('profil');
  const tKyc = useTranslations('kyc');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const { openLogin, openSignup } = useAuthModal();
  const { openKyc } = useKycModal();
  const kycRequired = searchParams.get('kyc') === 'required';
  const [isLoggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const prefix = `/${locale}`;

  useEffect(() => {
    const token = getToken();
    setLoggedIn(!!token);
    if (!token) {
      setUser(null);
      setKycStatus(null);
      return;
    }
    apiFetch('/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((userData) => {
        if (userData) {
          setUser(userData);
          if (userData.role) {
            localStorage.setItem('user_role', userData.role);
          }
          setKycStatus(userData?.kycStatus ?? null);
        }
      })
      .catch(() => {
        setUser(null);
        setKycStatus(null);
      });
  }, []);

  const getUserDisplayName = () => {
    if (!user) return '';
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) return user.firstName;
    if (user.lastName) return user.lastName;
    return '';
  };

  const menuItemClass = 'flex items-center gap-3 py-3 text-black';
  const iconClass = 'h-5 w-5 shrink-0 text-black';
  const sectionTitleClass = 'mb-2 text-base font-bold text-black';
  const dividerClass = 'border-t border-gray-200';

  return (
    <div className="min-h-screen bg-white pb-24 md:pb-8">
      <div className="mx-auto max-w-md px-4 py-6">
        {/* Titre */}
        <h1 className="mb-6 text-2xl font-bold text-black">{t('title')}</h1>

        {/* Section Utilisateur */}
        {isLoggedIn && user && (
          <div className="mb-6 flex items-center gap-3">
            {user.avatarUrl ? (
              <S3Image
                src={user.avatarUrl}
                alt={getUserDisplayName() || 'User'}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
            <span className="text-base text-black">{getUserDisplayName() || 'Utilisateur'}</span>
          </div>
        )}

        {/* Section Connexion si non connecté */}
        {!isLoggedIn && (
          <div className="mb-8 rounded-lg border border-gray-200 bg-gray-50 p-6">
            <p className="mb-4 text-neutral-700">{t('connectToStart')}</p>
            <button
              type="button"
              onClick={() => openLogin()}
              className="mb-3 block w-full rounded-lg bg-black py-3 text-center font-medium text-white hover:bg-gray-800"
            >
              {tCommon('login')}
            </button>
            <p className="text-center text-sm text-neutral-600">
              {t('noAccount')}{' '}
              <button
                type="button"
                onClick={() => openSignup()}
                className="font-medium text-black underline"
              >
                {tCommon('signup')}
              </button>
            </p>
          </div>
        )}

        {/* Section KYC si connecté mais non vérifié */}
        {isLoggedIn && kycStatus !== 'APPROVED' && (
          <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-6">
            {kycRequired && <p className="mb-2 font-medium text-amber-800">{tKyc('kycRequired')}</p>}
            {kycStatus === 'PENDING' && <p className="text-neutral-700">{tKyc('statusPending')}</p>}
            {kycStatus === 'PENDING_REVIEW' && <p className="text-neutral-700">{tKyc('statusPendingReview')}</p>}
            {(!kycStatus || kycStatus === 'REJECTED') && (
              <p className="text-neutral-700">{tKyc('verifyIdentity')}</p>
            )}
            {(!kycStatus || kycStatus === 'REJECTED' || kycRequired) && (
              <button
                type="button"
                onClick={() => openKyc(kycRequired)}
                className="mt-4 block w-full rounded-lg bg-black py-3 text-center font-medium text-white hover:bg-gray-800"
              >
                {tKyc('goToKyc')}
              </button>
            )}
          </div>
        )}

        {/* Section Propriétaire */}
        <section className="mb-6">
          <h2 className={sectionTitleClass}>{t('owner')}</h2>
          <Link href={`${prefix}/host`} className={menuItemClass}>
            <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
            </svg>
            <span className="flex-1">{t('rentMyVehicles')}</span>
            <svg className="ml-auto h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </section>

        <div className={dividerClass} />

        {/* Section Assistance */}
        <section className="mb-6 mt-6">
          <h2 className={sectionTitleClass}>{t('assistance')}</h2>
          <div className="space-y-0">
            <Link href="#languageAndCurrency" className={menuItemClass}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="flex-1">{t('howItWorks')}</span>
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link href="#" className={menuItemClass}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="flex-1">{t('visitHelpCenter')}</span>
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link href="#" className={menuItemClass}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14v7m0-7a7 7 0 00-7 7m7-7a7 7 0 017 7" />
              </svg>
              <span className="flex-1">{t('assistanceDrivePark')}</span>
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </section>

        <div className={dividerClass} />

        {/* Section Social */}
        <section className="mb-6 mt-6">
          <h2 className={sectionTitleClass}>{t('social')}</h2>
          <a href="#" className={menuItemClass}>
            <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            <span className="flex-1">{t('followInstagram')}</span>
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </section>
      </div>
    </div>
  );
}
