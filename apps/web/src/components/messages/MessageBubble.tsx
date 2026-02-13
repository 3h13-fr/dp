'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { S3Image } from '@/components/S3Image';
import type { Message, MessageAttachment } from './types';

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const isYesterday =
    new Date(now.getTime() - 86400000).toDateString() === d.toDateString();
  if (isToday) return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (isYesterday) return `Yesterday ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
  return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}

function AttachmentDisplay({
  att,
  onImageClick,
}: {
  att: MessageAttachment;
  onImageClick?: (url: string) => void;
}) {
  if (att.type === 'image') {
    return (
      <div className="mt-1 overflow-hidden rounded-lg">
        <button
          type="button"
          onClick={() => onImageClick?.(att.url)}
          className="block max-w-[240px] focus:outline-none focus:ring-2 focus:ring-primary rounded-lg overflow-hidden"
        >
          <S3Image
            src={att.url}
            alt={att.filename ?? 'Image'}
            className="max-h-[200px] w-auto object-cover"
            style={{ maxWidth: 240 }}
          />
        </button>
      </div>
    );
  }
  return (
    <a
      href={att.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1 flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground hover:bg-muted/50"
    >
      <svg className="h-4 w-4 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.5a2 2 0 012 2v5.5a2 2 0 01-2 2z" />
      </svg>
      <span className="truncate">{att.filename ?? 'File'}</span>
    </a>
  );
}

export function MessageBubble({
  message,
  isOwn,
  systemLabel,
  senderRole,
  showBookingHref,
  onImageClick,
}: {
  message: Message;
  isOwn: boolean;
  systemLabel?: string;
  senderRole?: 'host' | 'guest';
  showBookingHref?: string | null;
  onImageClick?: (url: string) => void;
}) {
  const t = useTranslations('messages');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const handleImageClick = (url: string) => {
    if (onImageClick) onImageClick(url);
    else setLightboxUrl(url);
  };

  const isSystem = message.isSystem;
  const alignRight = !isSystem && isOwn;
  const senderName = [message.sender?.firstName, message.sender?.lastName].filter(Boolean).join(' ') || '';
  const roleLabel = senderRole === 'host' ? t('host') : senderRole === 'guest' ? t('traveler') : '';

  if (isSystem) {
    return (
      <div className="w-full py-1">
        <p className="text-sm text-muted-foreground">
          {message.body}
          {showBookingHref && (
            <>
              {' '}
              <Link href={showBookingHref} className="text-primary underline hover:no-underline">
                {t('showListing')}
              </Link>
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className={`flex gap-2 ${alignRight ? 'flex-row-reverse' : ''}`}>
      {!alignRight && (
        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-muted">
          {message.sender?.avatarUrl ? (
            <S3Image
              src={message.sender.avatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-medium text-muted-foreground">
              {message.sender?.firstName?.[0] ?? message.sender?.lastName?.[0] ?? '?'}
            </div>
          )}
        </div>
      )}
      <div
        className={`flex max-w-[85%] flex-col ${alignRight ? 'items-end' : ''}`}
        title={formatTime(message.createdAt)}
      >
        <span className="text-xs text-muted-foreground">
          {systemLabel ?? (roleLabel ? `${senderName} · ${roleLabel}` : senderName)}
        </span>
        <div
          className={`mt-0.5 rounded-2xl px-3 py-2 text-sm ${
            alignRight
              ? 'rounded-br-md bg-primary text-primary-foreground'
              : 'rounded-bl-md bg-muted'
          }`}
        >
          {message.body ? <p className="whitespace-pre-wrap break-words">{message.body}</p> : null}
          {message.attachments?.map((att) => (
            <AttachmentDisplay
              key={att.id ?? att.url}
              att={att}
              onImageClick={handleImageClick}
            />
          ))}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{formatTime(message.createdAt)}</p>
      </div>

      {lightboxUrl && (
        <button
          type="button"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
          aria-label="Close"
        >
          <S3Image
            src={lightboxUrl}
            alt=""
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </button>
      )}
    </div>
  );
}
