'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api';
import type { PendingAttachment } from './types';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILES = 5;
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

function inferType(file: File): 'image' | 'file' {
  return IMAGE_TYPES.includes(file.type) ? 'image' : 'file';
}

export function MessageComposer({
  onSend,
  disabled,
  placeholder,
  averageResponseHours = 3,
}: {
  onSend: (body: string, attachmentUrls: { url: string; type: 'image' | 'file'; filename?: string }[]) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  averageResponseHours?: number;
}) {
  const t = useTranslations('messages');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSend =
    (body.trim().length > 0 || attachments.length > 0) && !sending && !uploading && !disabled;

  const handleAttach = () => {
    fileInputRef.current?.click();
  };

  const uploadFile = async (file: File): Promise<{ url: string; type: 'image' | 'file'; filename: string }> => {
    if (file.size > MAX_SIZE_BYTES) {
      throw new Error(t('fileTooLarge'));
    }
    const presignRes = await apiFetch('/uploads/presign', {
      method: 'POST',
      body: JSON.stringify({
        purpose: 'message_attachment',
        contentType: file.type || 'application/octet-stream',
        filename: file.name,
      }),
    });
    if (!presignRes.ok) throw new Error(t('uploadFailed'));
    const { uploadUrl, publicUrl } = await presignRes.json();
    if (!uploadUrl) throw new Error(t('uploadFailed'));
    const putRes = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
    });
    if (!putRes.ok) throw new Error(t('uploadFailed'));
    return { url: publicUrl, type: inferType(file), filename: file.name };
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const toAdd = Math.min(MAX_FILES - attachments.length, files.length);
    if (toAdd <= 0) {
      setError(t('maxAttachments'));
      e.target.value = '';
      return;
    }
    setError(null);
    setUploading(true);
    const newAttachments: PendingAttachment[] = [];
    try {
      for (let i = 0; i < toAdd; i++) {
        const file = files[i];
        if (file.size > MAX_SIZE_BYTES) {
          setError(t('fileTooLarge'));
          continue;
        }
        const { url, type, filename } = await uploadFile(file);
        const preview = type === 'image' ? URL.createObjectURL(file) : undefined;
        newAttachments.push({ url, type, filename, preview });
      }
      setAttachments((prev) => [...prev, ...newAttachments].slice(0, MAX_FILES));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('uploadFailed'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      const next = [...prev];
      const a = next[index];
      if (a.preview) URL.revokeObjectURL(a.preview);
      next.splice(index, 1);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      await onSend(
        body.trim(),
        attachments.map((a) => ({ url: a.url, type: a.type, filename: a.filename })),
      );
      setBody('');
      attachments.forEach((a) => a.preview && URL.revokeObjectURL(a.preview));
      setAttachments([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('sendFailed'));
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-border bg-background p-2">
      {averageResponseHours != null && averageResponseHours > 0 && (
        <p className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {t('averageResponseTime', { hours: averageResponseHours })}
        </p>
      )}
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((a, i) => (
            <div
              key={`${a.url}-${i}`}
              className="relative inline-block"
            >
              {a.type === 'image' && a.preview ? (
                <div className="h-14 w-14 overflow-hidden rounded-lg border border-border">
                  <img src={a.preview} alt="" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex h-14 items-center gap-1 rounded-lg border border-border bg-muted/30 px-2">
                  <span className="truncate text-xs max-w-[80px]">{a.filename ?? 'File'}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => removeAttachment(i)}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs"
                aria-label={t('removeAttachment')}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      {error && (
        <p className="mb-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.txt"
          multiple
          className="hidden"
          onChange={onFileChange}
        />
        <button
          type="button"
          onClick={handleAttach}
          disabled={disabled || uploading || attachments.length >= MAX_FILES}
          className="shrink-0 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
          title={t('attachFile')}
          aria-label={t('attachFile')}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={placeholder ?? t('typePlaceholder')}
          disabled={disabled || sending}
          rows={1}
          className="min-h-[40px] flex-1 resize-none rounded-2xl border border-border bg-muted/30 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (canSend) handleSubmit(e as unknown as React.FormEvent);
            }
          }}
        />
        <button
          type="submit"
          disabled={!canSend}
          className="shrink-0 rounded-full bg-primary p-2 text-primary-foreground hover:opacity-90 disabled:opacity-50"
          title={t('send')}
          aria-label={t('send')}
          data-testid="message-send-button"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
      {uploading && (
        <p className="mt-1 text-xs text-muted-foreground">{t('uploading')}</p>
      )}
    </form>
  );
}
