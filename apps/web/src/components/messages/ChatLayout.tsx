'use client';

import { useTranslations } from 'next-intl';
import { ConversationList } from './ConversationList';
import { ChatThread } from './ChatThread';
import { getListingTitle } from '@/lib/listings';
import type { Conversation, Message } from './types';

function formatThreadSubtitle(
  startIso: string,
  endIso: string,
  listingTitle: string,
  city?: string | null,
): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const datePart = sameMonth
    ? `${start.getDate()}-${end.getDate()} ${start.toLocaleDateString(undefined, { month: 'short' })}. ${start.getFullYear()}`
    : `${start.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} ${end.getFullYear()}`;
  const locationPart = city ? ` ${listingTitle} ${city}` : ` ${listingTitle}`;
  return `${datePart} •${locationPart}`.trim();
}

export function ChatLayout({
  basePath,
  locale,
  conversations,
  currentBookingId,
  loadingConversations,
  thread,
  threadLoading,
  currentUserId,
  onSend,
  fullHeight = false,
  showTitle = true,
}: {
  basePath: string;
  locale: string;
  conversations: Conversation[];
  currentBookingId: string | null;
  loadingConversations: boolean;
  thread: Message[];
  threadLoading: boolean;
  currentUserId: string | null;
  onSend: (body: string, attachmentUrls: { url: string; type: 'image' | 'file'; filename?: string }[]) => Promise<void>;
  fullHeight?: boolean;
  showTitle?: boolean;
}) {
  const t = useTranslations('messages');
  const currentConversation = conversations.find((c) => c.bookingId === currentBookingId);
  const isDrivePark = currentBookingId === 'drivepark';
  const driveParkTitle = t('driveParkConversation');

  const threadTitle = !currentBookingId
    ? ''
    : isDrivePark
      ? driveParkTitle
      : currentConversation
        ? [currentConversation.otherUser?.firstName, currentConversation.otherUser?.lastName].filter(Boolean).join(' ') || getListingTitle(currentConversation.listing)
        : '';
  const threadSubtitle =
    currentConversation && !isDrivePark && currentConversation.bookingStartAt && currentConversation.bookingEndAt
      ? formatThreadSubtitle(
          currentConversation.bookingStartAt,
          currentConversation.bookingEndAt,
          getListingTitle(currentConversation.listing),
          currentConversation.listingCity,
        )
      : currentConversation && !isDrivePark
        ? currentConversation.status
        : undefined;
  const showBookingHref =
    currentBookingId && !isDrivePark
      ? basePath.includes('/host/')
        ? `/${locale}/host/bookings/${currentBookingId}`
        : `/${locale}/bookings/${currentBookingId}`
      : null;

  return (
    <div
      className={`flex flex-col md:flex-row md:rounded-lg md:border md:border-border bg-background ${
        fullHeight || currentBookingId
          ? 'overflow-hidden flex-1 min-h-0 h-full'
          : ''
      } ${fullHeight ? 'h-full' : currentBookingId ? 'h-[calc(100vh-4rem)] md:max-h-[800px]' : !currentBookingId ? 'md:h-[calc(100vh-12rem)] md:max-h-[800px]' : ''}`}
    >
      {/* List: on mobile full width; on desktop sidebar (~1/3) */}
      <aside
        className={`w-full md:w-96 md:max-w-sm shrink-0 flex flex-col ${currentBookingId ? 'hidden md:flex' : ''}`}
      >
        {showTitle && (
          <div className="hidden md:block px-4 py-6 md:py-3 md:border-b md:border-border">
            <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
          </div>
        )}
        <ConversationList
          conversations={conversations}
          currentBookingId={currentBookingId}
          basePath={basePath}
          loading={loadingConversations}
        />
      </aside>
      <main className="flex-1 flex flex-col min-h-0">
        {currentBookingId ? (
          <ChatThread
            thread={thread}
            currentUserId={currentUserId}
            bookingId={currentBookingId}
            isDrivePark={isDrivePark}
            onSend={onSend}
            loading={threadLoading}
            threadTitle={threadTitle}
            threadSubtitle={threadSubtitle}
            otherUserAvatarUrl={currentConversation?.otherUser?.avatarUrl ?? null}
            showBookingHref={showBookingHref}
            basePath={basePath}
          />
        ) : (
          <div className="hidden md:flex flex-1 flex-col items-center justify-center text-muted-foreground p-4">
            <p className="text-sm">{t('selectConversation')}</p>
          </div>
        )}
      </main>
    </div>
  );
}
