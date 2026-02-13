'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { getToken, apiFetch } from '@/lib/api';
import { useEffect, useState } from 'react';
import { useKycModal } from '@/contexts/KycModalContext';

type Section = 'personal' | 'security' | 'notifications';

type UserMe = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  profileData?: {
    preferredName?: string;
    hostDisplayName?: string;
    residentialAddress?: string;
    postalAddress?: string;
    emergencyContacts?: string;
  } | null;
  kycStatus?: string | null;
};

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  const first = local.slice(0, 1);
  return `${first}***@${domain}`;
}

function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return '***';
  const digits = phone.replace(/\D/g, '');
  const last4 = digits.slice(-4);
  const formatted = last4.length >= 4 ? `${last4.slice(0, 2)} ${last4.slice(2)}` : last4;
  const prefix = phone.trim().startsWith('+') ? '+** ** **' : '** ** **';
  return `${prefix} ${formatted}`;
}

function FieldRow({
  label,
  value,
  action,
  actionLabel,
}: {
  label: string;
  value: string;
  action?: () => void;
  actionLabel: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-200 py-4">
      <div>
        <p className="text-sm font-semibold text-black">{label}</p>
        <p className="mt-0.5 text-sm text-neutral-700">{value}</p>
      </div>
      {action ? (
        <button type="button" onClick={action} className="text-sm font-medium text-black underline hover:no-underline">
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

type EditableFieldRowProps = {
  label: string;
  value: string;
  fieldKey: string;
  fieldType: 'text' | 'textarea' | 'name'; // name = firstName + lastName
  onSave: (value: string | { firstName: string; lastName: string }) => Promise<void>;
  disabled?: boolean;
};

function EditableFieldRow({ label, value, fieldKey, fieldType, onSave, disabled = false }: EditableFieldRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const [tempFirstName, setTempFirstName] = useState('');
  const [tempLastName, setTempLastName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const t = useTranslations('parametres');
  const tCommon = useTranslations('common');

  // Helper function to mask phone in display mode
  const getDisplayValue = () => {
    if (fieldKey === 'phone' && !isEditing && value !== t('infoNotProvided')) {
      return maskPhone(value);
    }
    return value;
  };

  useEffect(() => {
    if (isEditing) {
      if (fieldType === 'name') {
        // Parse existing value to extract firstName and lastName
        const parts = value.split(' ').filter(Boolean);
        setTempFirstName(parts[0] || '');
        setTempLastName(parts.slice(1).join(' ') || '');
      } else {
        const infoNotProvided = t('infoNotProvided');
        setTempValue(value === infoNotProvided ? '' : value);
      }
    }
  }, [isEditing, value, fieldType, t]);

  const handleCancel = () => {
    setIsEditing(false);
    setTempValue(value);
    setError('');
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      if (fieldType === 'name') {
        await onSave({ firstName: tempFirstName, lastName: tempLastName });
      } else {
        await onSave(tempValue);
      }
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorSaving') || 'Error saving');
    } finally {
      setSaving(false);
    }
  };

  if (disabled) {
    return (
      <div className="flex items-center justify-between border-b border-neutral-200 py-4">
        <div>
          <p className="text-sm font-semibold text-black">{label}</p>
          <p className="mt-0.5 text-sm text-neutral-700">{value}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-neutral-200">
      <div className={`flex items-center justify-between py-4 ${isEditing ? 'pb-2' : ''}`}>
        <div>
          <p className="text-sm font-semibold text-black">{label}</p>
          {!isEditing && <p className="mt-0.5 text-sm text-neutral-700">{getDisplayValue()}</p>}
        </div>
        {!isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-sm font-medium text-black underline hover:no-underline"
          >
            {t('modify')}
          </button>
        )}
      </div>

      {isEditing && (
        <div className="pb-4 transition-all duration-200">
          {fieldType === 'name' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">
                  {t('firstName') || 'Prénom'}
                </label>
                <input
                  type="text"
                  value={tempFirstName}
                  onChange={(e) => setTempFirstName(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                  placeholder={t('firstName') || 'Prénom'}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">
                  {t('lastName') || 'Nom'}
                </label>
                <input
                  type="text"
                  value={tempLastName}
                  onChange={(e) => setTempLastName(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                  placeholder={t('lastName') || 'Nom'}
                />
              </div>
            </div>
          ) : fieldType === 'textarea' ? (
            <textarea
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
              rows={3}
              placeholder={label}
            />
          ) : (
            <input
              type="text"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
              placeholder={label}
            />
          )}
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-neutral-800 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-900 disabled:opacity-50"
            >
              {saving ? t('saving') || tCommon('saving') || 'Saving...' : t('save') || tCommon('save') || 'Save'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              {t('cancel') || tCommon('cancel') || 'Cancel'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfilParametresPage() {
  const t = useTranslations('parametres');
  const tProfil = useTranslations('profil');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const tNav = useTranslations('nav');
  const locale = useLocale();
  const prefix = `/${locale}`;
  const { openKyc } = useKycModal();

  const [section, setSection] = useState<Section>('personal');
  const [isLoggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState<UserMe | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changePasswordError, setChangePasswordError] = useState('');
  const [changePasswordSuccess, setChangePasswordSuccess] = useState(false);
  const [changePasswordSubmitting, setChangePasswordSubmitting] = useState(false);

  const loadUser = async () => {
    const token = getToken();
    setLoggedIn(!!token);
    if (!token) {
      setUserLoading(false);
      return;
    }
    try {
      const res = await apiFetch('/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setUserLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const handleSaveField = async (fieldKey: string, value: string | { firstName: string; lastName: string }) => {
    setRefreshing(true);
    try {
      const body: Record<string, unknown> = {};
      
      if (fieldKey === 'officialName') {
        const nameValue = value as { firstName: string; lastName: string };
        const firstName = nameValue.firstName?.trim();
        const lastName = nameValue.lastName?.trim();
        if (firstName) body.firstName = firstName;
        if (lastName) body.lastName = lastName;
      } else if (fieldKey === 'phone') {
        const phoneValue = (value as string)?.trim();
        if (phoneValue) body.phone = phoneValue;
      } else {
        // Fields stored in profileData
        const currentProfileData = (user?.profileData as Record<string, unknown>) || {};
        const fieldValue = (value as string)?.trim();
        if (fieldValue) {
          body.profileData = {
            ...currentProfileData,
            [fieldKey]: fieldValue,
          };
        } else {
          // Remove the field if empty
          const { [fieldKey]: _, ...rest } = currentProfileData;
          // Only send profileData if there are remaining fields, otherwise don't send it (will be set to null server-side)
          if (Object.keys(rest).length > 0) {
            body.profileData = rest;
          }
          // If rest is empty, don't send profileData at all - server will handle it
        }
      }

      const res = await apiFetch('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || t('errorSaving') || 'Error saving');
      }

      // Reload user data
      await loadUser();
    } catch (err) {
      setRefreshing(false);
      throw err;
    }
  };

  const sections: { id: Section; label: string; icon: 'person' | 'shield' | 'bell' }[] = [
    { id: 'personal', label: t('personalInfo'), icon: 'person' },
    { id: 'security', label: t('loginAndSecurity'), icon: 'shield' },
    { id: 'notifications', label: t('notifications'), icon: 'bell' },
  ];

  const navItemClass = (active: boolean) =>
    `flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors ${
      active ? 'bg-neutral-100 text-black' : 'text-neutral-700 hover:bg-neutral-50 hover:text-black'
    }`;

  if (!isLoggedIn) {
    return (
      <div className="min-h-[60vh] bg-white pb-24 md:pb-8">
        <div className="mx-auto max-w-lg px-4 py-8">
          <Link href={`${prefix}/profil`} className="mb-4 inline-flex items-center gap-1 text-neutral-600 hover:text-black">
            <span>←</span> {tCommon('back')}
          </Link>
          <h1 className="text-2xl font-bold text-black">{t('title')}</h1>
          <p className="mt-6 text-neutral-700">{tProfil('connectToStart')}</p>
          <Link
            href={`${prefix}/profil`}
            className="mt-4 inline-block rounded-lg bg-neutral-800 px-4 py-3 font-medium text-white hover:bg-neutral-900"
          >
            {tCommon('login')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] bg-white pb-24 md:pb-8">
      <div className="mx-auto max-w-4xl px-4 py-8 lg:grid lg:grid-cols-[240px_1fr] lg:gap-8">
        {/* Sidebar — desktop */}
        <aside className="hidden lg:block">
          <Link
            href={`${prefix}/profil`}
            className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-black"
          >
            <span>←</span> {t('backToProfile')}
          </Link>
          <h2 className="mt-4 text-xl font-bold text-black">{t('title')}</h2>
          <nav className="mt-4 space-y-0.5" aria-label={t('title')}>
            {sections.map(({ id, label, icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setSection(id)}
                className={navItemClass(section === id)}
              >
                {icon === 'person' && (
                  <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
                {icon === 'shield' && (
                  <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                )}
                {icon === 'bell' && (
                  <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                )}
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="min-w-0">
          {/* Mobile: back + section picker */}
          <div className="lg:hidden">
            <Link
              href={`${prefix}/profil`}
              className="mb-4 inline-flex items-center gap-1 text-neutral-600 hover:text-black"
            >
              <span>←</span> {t('backToProfile')}
            </Link>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
              {sections.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSection(id)}
                  className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium ${
                    section === id ? 'bg-neutral-200 text-black' : 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Section content */}
          {section === 'personal' && (
            <>
              <h1 className="mt-6 text-2xl font-bold text-black lg:mt-0">{t('personalInfo')}</h1>
              <div className="mt-6">
                {userLoading ? (
                  <p className="text-neutral-500">{tCommon('loading')}</p>
                ) : (
                  <>
                    <EditableFieldRow
                      label={t('officialName')}
                      value={
                        user?.firstName || user?.lastName
                          ? [user.firstName, user.lastName].filter(Boolean).join(' ') || t('infoNotProvided')
                          : t('infoNotProvided')
                      }
                      fieldKey="officialName"
                      fieldType="name"
                      onSave={(value) => handleSaveField('officialName', value)}
                    />
                    <EditableFieldRow
                      label={t('preferredName')}
                      value={
                        (user?.profileData as { preferredName?: string } | null)?.preferredName 
                          ? (user?.profileData as { preferredName: string }).preferredName
                          : t('infoNotProvided')
                      }
                      fieldKey="preferredName"
                      fieldType="text"
                      onSave={(value) => handleSaveField('preferredName', value)}
                    />
                    <EditableFieldRow
                      label={t('hostDisplayName')}
                      value={
                        (user?.profileData as { hostDisplayName?: string } | null)?.hostDisplayName
                          ? (user?.profileData as { hostDisplayName: string }).hostDisplayName
                          : t('infoNotProvided')
                      }
                      fieldKey="hostDisplayName"
                      fieldType="text"
                      onSave={(value) => handleSaveField('hostDisplayName', value)}
                    />
                    <FieldRow
                      label={t('email')}
                      value={user?.email ? maskEmail(user.email) : t('infoNotProvided')}
                      actionLabel={t('modify')}
                      action={() => {}}
                    />
                    <EditableFieldRow
                      label={t('phone')}
                      value={user?.phone || t('infoNotProvided')}
                      fieldKey="phone"
                      fieldType="text"
                      onSave={(value) => handleSaveField('phone', value)}
                    />
                    <div className="flex items-center justify-between border-b border-neutral-200 py-4">
                      <div>
                        <p className="text-sm font-semibold text-black">{t('identityVerification')}</p>
                        <p className="mt-0.5 text-sm text-neutral-700">
                          {user?.kycStatus === 'APPROVED' ? t('identityVerified') : t('identityNotVerified')}
                        </p>
                      </div>
                      {user?.kycStatus !== 'APPROVED' && (
                        <button
                          type="button"
                          onClick={() => openKyc(true)}
                          className="text-sm font-medium text-black underline hover:no-underline"
                        >
                          {t('modify')}
                        </button>
                      )}
                    </div>
                    <EditableFieldRow
                      label={t('residentialAddress')}
                      value={
                        (user?.profileData as { residentialAddress?: string } | null)?.residentialAddress
                          ? (user?.profileData as { residentialAddress: string }).residentialAddress
                          : t('infoNotProvided')
                      }
                      fieldKey="residentialAddress"
                      fieldType="textarea"
                      onSave={(value) => handleSaveField('residentialAddress', value)}
                    />
                    <EditableFieldRow
                      label={t('postalAddress')}
                      value={
                        (user?.profileData as { postalAddress?: string } | null)?.postalAddress
                          ? (user?.profileData as { postalAddress: string }).postalAddress
                          : t('infoNotProvided')
                      }
                      fieldKey="postalAddress"
                      fieldType="textarea"
                      onSave={(value) => handleSaveField('postalAddress', value)}
                    />
                    <EditableFieldRow
                      label={t('emergencyContacts')}
                      value={
                        (user?.profileData as { emergencyContacts?: string } | null)?.emergencyContacts
                          ? (user?.profileData as { emergencyContacts: string }).emergencyContacts
                          : t('infoNotProvided')
                      }
                      fieldKey="emergencyContacts"
                      fieldType="textarea"
                      onSave={(value) => handleSaveField('emergencyContacts', value)}
                    />
                  </>
                )}
              </div>

              <div className="mt-8 space-y-4">
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="flex gap-3">
                    <svg className="h-5 w-5 shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-black">{t('infoBlock1Title')}</p>
                      <p className="mt-1 text-sm text-neutral-700">{t('infoBlock1Text')}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="flex gap-3">
                    <svg className="h-5 w-5 shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-black">{t('infoBlock2Title')}</p>
                      <p className="mt-1 text-sm text-neutral-700">{t('infoBlock2Text')}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="flex gap-3">
                    <svg className="h-5 w-5 shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-black">{t('infoBlock3Title')}</p>
                      <p className="mt-1 text-sm text-neutral-700">{t('infoBlock3Text')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {section === 'security' && (
            <>
              <h1 className="mt-6 text-2xl font-bold text-black lg:mt-0">{t('loginAndSecurity')}</h1>
              <div className="mt-6">
                <p className="text-sm text-neutral-700">{tProfil('changePasswordSubtitle')}</p>
                {changePasswordSuccess ? (
                  <p className="mt-4 text-sm font-medium text-green-700">{tProfil('changePasswordSuccess')}</p>
                ) : (
                  <form
                    className="mt-4 flex flex-col gap-4"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setChangePasswordError('');
                      if (newPassword !== confirmNewPassword) {
                        setChangePasswordError(tProfil('changePasswordMismatch'));
                        return;
                      }
                      if (newPassword.length < 8) {
                        setChangePasswordError(tErrors('passwordTooShort'));
                        return;
                      }
                      setChangePasswordSubmitting(true);
                      try {
                        const res = await apiFetch('/auth/change-password', {
                          method: 'POST',
                          body: JSON.stringify({ currentPassword, newPassword }),
                        });
                        const data = await res.json().catch(() => ({}));
                        if (!res.ok) {
                          setChangePasswordError(
                            res.status === 401 ? tProfil('changePasswordWrongCurrent') : (data.message ?? ''),
                          );
                          setChangePasswordSubmitting(false);
                          return;
                        }
                        setChangePasswordSuccess(true);
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmNewPassword('');
                      } catch {
                        setChangePasswordError(tErrors('generic'));
                      }
                      setChangePasswordSubmitting(false);
                    }}
                  >
                    <input
                      type="password"
                      placeholder={tProfil('currentPassword')}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="rounded-lg border border-neutral-200 bg-white px-4 py-2"
                      required
                      autoComplete="current-password"
                    />
                    <input
                      type="password"
                      placeholder={tProfil('newPassword')}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="rounded-lg border border-neutral-200 bg-white px-4 py-2"
                      minLength={8}
                      required
                      autoComplete="new-password"
                    />
                    <input
                      type="password"
                      placeholder={tProfil('confirmNewPassword')}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="rounded-lg border border-neutral-200 bg-white px-4 py-2"
                      minLength={8}
                      required
                      autoComplete="new-password"
                    />
                    {changePasswordError && (
                      <p className="text-sm text-red-600">{changePasswordError}</p>
                    )}
                    <button
                      type="submit"
                      disabled={changePasswordSubmitting}
                      className="rounded-lg bg-neutral-800 py-2 font-medium text-white disabled:opacity-50"
                    >
                      {changePasswordSubmitting ? tProfil('changePasswordSubmitting') : tProfil('changePasswordSubmit')}
                    </button>
                  </form>
                )}
              </div>
            </>
          )}

          {section === 'notifications' && (
            <>
              <h1 className="mt-6 text-2xl font-bold text-black lg:mt-0">{t('notifications')}</h1>
              <div className="mt-6">
                <p className="text-sm text-neutral-700">{tProfil('notificationsDescription')}</p>
                <Link
                  href={`${prefix}/notifications`}
                  className="mt-4 inline-block rounded-lg bg-neutral-800 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-900"
                >
                  {tNav('notifications')}
                </Link>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
