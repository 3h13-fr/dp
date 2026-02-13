'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { getToken, apiFetch } from '@/lib/api';
import { useEffect, useState } from 'react';

type KycRecord = {
  id: string;
  status: string;
  firstName?: string | null;
  lastName?: string | null;
  dateOfBirth?: string | null;
  nationality?: string | null;
  documentType?: string | null;
  reviewReason?: string | null;
  rejectionReason?: string | null;
};

async function uploadFile(file: File): Promise<string> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const res = await apiFetch('/uploads/presign', {
    method: 'POST',
    body: JSON.stringify({
      purpose: 'kyc_id',
      contentType: file.type || 'image/jpeg',
      filename: file.name,
    }),
  });
  const data = await res.json();
  if (!data?.uploadUrl || !data?.publicUrl) {
    // Dev mode: if S3 is not configured, use a placeholder URL for testing
    if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
      console.warn('S3 not configured. Using placeholder URL for KYC document upload (dev mode).');
      return `https://via.placeholder.com/400x300?text=${encodeURIComponent(file.name)}`;
    }
    throw new Error('File upload is not configured. Please contact support or configure S3 storage.');
  }
  const putRes = await fetch(data.uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type || 'image/jpeg' },
  });
  if (!putRes.ok) throw new Error('Upload failed');
  return data.publicUrl;
}

type KycFormContentProps = {
  onClose?: () => void;
  onSuccess?: () => void;
  kycRequired?: boolean;
  /** When true, no back link / full-page chrome (e.g. inside overlay). */
  embedded?: boolean;
};

export function KycFormContent({ onClose, onSuccess, kycRequired = false, embedded = false }: KycFormContentProps) {
  const t = useTranslations('kyc');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const prefix = `/${locale}`;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kyc, setKyc] = useState<KycRecord | null>(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    nationality: '',
    documentType: 'id_card' as 'id_card' | 'passport',
  });
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    apiFetch('/kyc')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setKyc(data);
        if (data?.firstName) setForm((f) => ({ ...f, firstName: data.firstName ?? '' }));
        if (data?.lastName) setForm((f) => ({ ...f, lastName: data.lastName ?? '' }));
        if (data?.dateOfBirth) {
          const d = data.dateOfBirth;
          setForm((f) => ({ ...f, dateOfBirth: d ? new Date(d).toISOString().slice(0, 10) : '' }));
        }
        if (data?.nationality) setForm((f) => ({ ...f, nationality: data.nationality ?? '' }));
        if (data?.documentType) setForm((f) => ({ ...f, documentType: data.documentType ?? 'id_card' }));
      })
      .catch(() => setKyc(null))
      .finally(() => setLoading(false));
  }, []);

  const showForm = !kyc || kyc.status === 'REJECTED';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('First name and last name are required');
      return;
    }
    const needsBack = form.documentType === 'id_card';
    if (!frontFile) {
      setError('Please upload the front of your document');
      return;
    }
    if (needsBack && !backFile) {
      setError('Please upload the back of your identity card');
      return;
    }
    setSubmitting(true);
    try {
      const idDocUrl = await uploadFile(frontFile);
      let idDocBackUrl: string | undefined;
      if (needsBack && backFile) idDocBackUrl = await uploadFile(backFile);
      const res = await apiFetch('/kyc', {
        method: 'POST',
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          dateOfBirth: form.dateOfBirth || undefined,
          nationality: form.nationality.trim() || undefined,
          documentType: form.documentType,
          idDocUrl,
          idDocBackUrl,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || 'Submission failed');
      }
      const data = await res.json();
      setKyc(data);
      setFrontFile(null);
      setBackFile(null);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  if (typeof window !== 'undefined' && !getToken()) {
    return (
      <div>
        <p className="text-neutral-700">{t('kycRequired')}</p>
        {embedded && onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="mt-4 inline-block rounded-lg bg-neutral-800 px-4 py-3 font-medium text-white hover:bg-neutral-900"
          >
            {tCommon('close')}
          </button>
        ) : (
          <Link
            href={`${prefix}/login?redirect=${encodeURIComponent(`${prefix}/profil/kyc${kycRequired ? '?kyc=required' : ''}`)}`}
            className="mt-4 inline-block rounded-lg bg-neutral-800 px-4 py-3 font-medium text-white hover:bg-neutral-900"
          >
            {tCommon('login')}
          </Link>
        )}
      </div>
    );
  }

  return (
    <div>
      {embedded && onClose && (
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100 hover:text-black"
            aria-label={tCommon('close')}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      {!embedded && (
        <Link href={`${prefix}/profil`} className="mb-4 inline-flex items-center gap-1 text-neutral-600 hover:text-black">
          <span>←</span> {tCommon('back')}
        </Link>
      )}
      <h1 className="text-2xl font-bold text-black">{t('title')}</h1>
      <p className="mt-1 text-neutral-600">{t('subtitle')}</p>

      {loading && <p className="mt-6 text-neutral-500">{tCommon('loading')}</p>}

      {!loading && kyc?.status === 'APPROVED' && (
        <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-6">
          <p className="font-medium text-green-800">{t('statusApproved')}</p>
          {embedded && onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="mt-3 inline-block text-green-700 underline"
            >
              {tCommon('close')}
            </button>
          ) : (
            <Link href={`${prefix}/profil`} className="mt-3 inline-block text-green-700 underline">
              {tCommon('back')} to profile
            </Link>
          )}
        </div>
      )}

      {!loading && kyc?.status === 'PENDING' && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-6">
          <p className="font-medium text-amber-800">{t('statusPending')}</p>
        </div>
      )}

      {!loading && kyc?.status === 'PENDING_REVIEW' && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-6">
          <p className="font-medium text-amber-800">{t('statusPendingReview')}</p>
        </div>
      )}

      {!loading && showForm && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {kycRequired && (
            <p className="font-medium text-amber-800">{t('kycRequired')}</p>
          )}
          {kyc?.status === 'REJECTED' && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {t('resubmitAfterReject')}
              {kyc.rejectionReason && (
                <p className="mt-2 font-medium">Reason: {kyc.rejectionReason}</p>
              )}
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-neutral-700">{t('firstName')}</label>
            <input
              type="text"
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">{t('lastName')}</label>
            <input
              type="text"
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">{t('dateOfBirth')}</label>
            <input
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">{t('nationality')}</label>
            <input
              type="text"
              value={form.nationality}
              onChange={(e) => setForm((f) => ({ ...f, nationality: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"
              placeholder="e.g. French"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">{t('documentType')}</label>
            <div className="mt-2 flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="documentType"
                  checked={form.documentType === 'id_card'}
                  onChange={() => setForm((f) => ({ ...f, documentType: 'id_card' }))}
                />
                {t('documentTypeIdCard')}
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="documentType"
                  checked={form.documentType === 'passport'}
                  onChange={() => setForm((f) => ({ ...f, documentType: 'passport' }))}
                />
                {t('documentTypePassport')}
              </label>
            </div>
          </div>
          <p className="text-sm text-neutral-500">{t('uploadHint')}</p>
          <div>
            <label className="block text-sm font-medium text-neutral-700">{t('idDocFront')}</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setFrontFile(e.target.files?.[0] ?? null)}
              className="mt-1 w-full text-sm"
              required
            />
          </div>
          {form.documentType === 'id_card' && (
            <div>
              <label className="block text-sm font-medium text-neutral-700">{t('idDocBack')}</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setBackFile(e.target.files?.[0] ?? null)}
                className="mt-1 w-full text-sm"
                required
              />
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-neutral-800 py-3 font-medium text-white hover:bg-neutral-900 disabled:opacity-60"
          >
            {submitting ? t('submitting') : t('submit')}
          </button>
        </form>
      )}
    </div>
  );
}
