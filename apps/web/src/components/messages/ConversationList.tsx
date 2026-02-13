'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { S3Image } from '@/components/S3Image';
import { getListingTitle } from '@/lib/listings';
import type { Conversation } from './types';

export function ConversationList({
  conversations,
  currentBookingId,
  basePath,
  loading,
}: {
  conversations: Conversation[];
  currentBookingId: string | null;
  basePath: string;
  loading?: boolean;
}) {
  const t = useTranslations('messages');

  if (loading) {
    return (
      <div className="flex flex-col gap-2 p-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <p className="p-4 text-sm text-muted-foreground">{t('noConversations')}</p>
    );
  }

  const driveParkTitle = t('driveParkConversation');

  return (
    <div className="flex flex-col overflow-y-auto">
      {conversations.map((c) => {
        const href = `${basePath}?bookingId=${encodeURIComponent(c.bookingId)}`;
        const isActive = currentBookingId === c.bookingId;
        const contactName = c.drivepark
          ? driveParkTitle
          : [c.otherUser?.firstName, c.otherUser?.lastName].filter(Boolean).join(' ') || '—';
        const lastMessagePreview = c.lastMessage
          ? c.lastMessage.body
            ? c.lastMessage.body
            : c.lastMessage.attachments?.length
              ? t('attachment')
              : ''
          : '';
        const bookingContext =
          !c.drivepark && c.bookingStartAt && c.bookingEndAt
            ? formatBookingContext(c.bookingStartAt, c.bookingEndAt, c.listingCity)
            : null;

        return (
          <Link
            key={c.bookingId}
            href={href}
            className={`flex items-center gap-3 border-b border-border/50 p-3 transition-colors hover:bg-muted/30 ${
              isActive ? 'bg-primary/10 border-l-2 border-l-primary' : ''
            }`}
          >
            <div className="relative h-14 w-14 shrink-0">
              <div className="absolute inset-0 overflow-hidden rounded-full bg-muted">
                {c.drivepark ? (
                  <div className="flex h-full w-full items-center justify-center text-lg font-medium text-muted-foreground">
                    D
                  </div>
                ) : c.listingFirstPhotoUrl ? (
                  <S3Image
                    src={c.listingFirstPhotoUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-medium text-muted-foreground">
                    {getListingTitle(c.listing).slice(0, 1) || '?'}
                  </div>
                )}
              </div>
              <div className="absolute bottom-0 right-0 h-7 w-7 overflow-hidden rounded-full border-2 border-background bg-muted">
                {c.otherUser?.avatarUrl ? (
                  <S3Image
                    src={c.otherUser.avatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-medium text-muted-foreground">
                    {c.otherUser
                      ? (c.otherUser.firstName?.[0] ?? c.otherUser.lastName?.[0] ?? '?')
                      : 'D'}
                  </div>
                )}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-semibold text-foreground">{contactName}</p>
                {c.lastMessage && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatListDate(c.lastMessage.createdAt)}
                  </span>
                )}
              </div>
              {lastMessagePreview ? (
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {lastMessagePreview}
                </p>
              ) : null}
              {bookingContext ? (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {bookingContext}
                </p>
              ) : null}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function formatListDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function formatBookingContext(startIso: string, endIso: string, city?: string | null): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const datePart = sameMonth
    ? `${start.getDate()}-${end.getDate()} ${start.toLocaleDateString(undefined, { month: 'short' })}. ${start.getFullYear()}`
    : `${start.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} ${end.getFullYear()}`;
  return city ? `${datePart} · ${city}` : datePart;
}
