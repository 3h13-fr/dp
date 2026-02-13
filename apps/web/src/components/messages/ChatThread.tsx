'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { S3Image } from '@/components/S3Image';
import { MessageBubble } from './MessageBubble';
import { MessageComposer } from './MessageComposer';
import type { Message } from './types';

function formatDateGroup(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString();
  const dStr = d.toDateString();
  if (dStr === today) return 'today';
  if (dStr === yesterday) return 'yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

export function ChatThread({
  thread,
  currentUserId,
  bookingId,
  isDrivePark,
  onSend,
  loading,
  threadTitle,
  threadSubtitle,
  otherUserAvatarUrl,
  showBookingHref,
  basePath,
}: {
  thread: Message[];
  currentUserId: string | null;
  bookingId: string | null;
  isDrivePark: boolean;
  onSend: (body: string, attachmentUrls: { url: string; type: 'image' | 'file'; filename?: string }[]) => Promise<void>;
  loading?: boolean;
  threadTitle: string;
  threadSubtitle?: string;
  otherUserAvatarUrl?: string | null;
  showBookingHref?: string | null;
  basePath?: string;
}) {
  const t = useTranslations('messages');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [thread.length]);

  if (!bookingId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground">
        <p className="text-sm">{t('selectConversation')}</p>
      </div>
    );
  }

  const driveParkTitle = t('driveParkConversation');

  // Group messages by date for separators
  const groups: { dateLabel: string; messages: Message[] }[] = [];
  let lastDate = '';
  for (const msg of thread) {
    const dateLabel = formatDateGroup(msg.createdAt);
    if (dateLabel !== lastDate) {
      groups.push({ dateLabel: dateLabel === 'today' ? t('today') : dateLabel === 'yesterday' ? t('yesterday') : dateLabel, messages: [] });
      lastDate = dateLabel;
    }
    groups[groups.length - 1].messages.push(msg);
  }

  return (
    <div className="relative flex flex-1 flex-col min-h-0">
      {/* Header: fixed at top on mobile, in flow on desktop */}
      <header className="shrink-0 border-b border-border bg-background px-3 py-3 md:px-4 flex items-center gap-2 md:gap-3 fixed md:relative inset-x-0 top-0 md:top-auto z-20 md:inset-auto pt-[env(safe-area-inset-top,0px)] md:pt-3">
        {basePath && (
          <Link
            href={basePath}
            className="md:hidden shrink-0 rounded-full p-2 text-foreground hover:bg-muted -ml-1"
            aria-label={t('allConversations')}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
        )}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
            {otherUserAvatarUrl ? (
              <S3Image src={otherUserAvatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-medium text-muted-foreground">
                {threadTitle.slice(0, 1) || '?'}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-semibold text-foreground">{threadTitle}</h2>
            {threadSubtitle && (
              <p className="truncate text-sm text-muted-foreground">{threadSubtitle}</p>
            )}
          </div>
        </div>
        {showBookingHref && (
          <Link
            href={showBookingHref}
            className="shrink-0 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/50"
          >
            {t('showBooking')}
          </Link>
        )}
      </header>

      {/* Messages: scrollable area; on mobile padding for fixed header + composer */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4 pt-[calc(72px+env(safe-area-inset-top,0px))] pb-[180px] md:pt-4 md:pb-4"
      >
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 w-3/4 max-w-sm rounded-2xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.dateLabel}>
              <p className="sticky top-0 z-10 mb-2 text-center text-xs font-medium text-muted-foreground">
                {g.dateLabel}
              </p>
              <div className="space-y-3">
                {g.messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isOwn={msg.senderId === currentUserId}
                    systemLabel={msg.isSystem ? driveParkTitle : undefined}
                    senderRole={msg.senderRole}
                    showBookingHref={showBookingHref ?? undefined}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {!isDrivePark && bookingId && (
        <div className="shrink-0 fixed md:relative inset-x-0 md:inset-x-auto bottom-0 z-20 border-t border-border bg-background pb-[env(safe-area-inset-bottom,0px)] md:pb-0">
          <MessageComposer
            onSend={onSend}
            placeholder={t('typePlaceholder')}
          />
        </div>
      )}
    </div>
  );
}
