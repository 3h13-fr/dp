'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useMessagesSocket, type IncomingMessage } from '@/hooks/useMessagesSocket';
import { ChatLayout } from '@/components/messages/ChatLayout';
import type { Conversation, Message } from '@/components/messages/types';

export default function MessagesPage() {
  const { ready } = useRequireAuth();
  const locale = useLocale();
  const t = useTranslations('messages');
  const searchParams = useSearchParams();
  const bookingIdParam = searchParams.get('bookingId');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [thread, setThread] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    apiFetch('/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((user) => {
        if (user) setCurrentUserId(user.id);
      });
    apiFetch('/messages/conversations')
      .then((r) => (r.ok ? r.json() : []))
      .then(setConversations)
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, [locale, ready]);

  useEffect(() => {
    if (!bookingIdParam || !ready) return;
    setThreadLoading(true);
    apiFetch(`/messages/thread?bookingId=${encodeURIComponent(bookingIdParam)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setThread)
      .catch(() => setThread([]))
      .finally(() => setThreadLoading(false));
  }, [bookingIdParam, ready]);

  const appendRealtimeMessage = useCallback((msg: IncomingMessage) => {
    setThread((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, { ...msg, isSystem: false }];
    });
  }, []);

  useMessagesSocket(bookingIdParam ?? null, appendRealtimeMessage);

  const sendMessage = useCallback(
    async (body: string, attachmentUrls: { url: string; type: 'image' | 'file'; filename?: string }[]) => {
      if (!bookingIdParam || bookingIdParam === 'drivepark') return;
      const res = await apiFetch('/messages/send', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: bookingIdParam,
          body: body.trim(),
          attachmentUrls: attachmentUrls.length ? attachmentUrls : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? 'Failed to send');
      }
      const msg = await res.json();
      setThread((prev) => [...prev, { ...msg, isSystem: false }]);
    },
    [bookingIdParam],
  );

  if (!ready) return null;

  const basePath = `/${locale}/messages`;
  const isThreadView = !!bookingIdParam;

  if (isThreadView) {
    // Thread view: full screen with fixed header and composer
    return (
      <div className="h-screen flex flex-col overflow-hidden mx-auto w-full max-w-5xl md:px-4 md:py-4">
        <ChatLayout
          basePath={basePath}
          locale={locale}
          conversations={conversations}
          currentBookingId={bookingIdParam}
          loadingConversations={loading}
          thread={thread}
          threadLoading={threadLoading}
          currentUserId={currentUserId}
          onSend={sendMessage}
          fullHeight={true}
        />
      </div>
    );
  }

  // List view: on mobile title in page like favoris/bookings, list full width; on desktop original layout
  return (
    <div className="mx-auto max-w-lg px-4 py-8 pb-24 md:pb-12 md:max-w-5xl">
      <h1 className="text-2xl font-bold text-black md:hidden">{t('title')}</h1>
      <ChatLayout
        basePath={basePath}
        locale={locale}
        conversations={conversations}
        currentBookingId={bookingIdParam}
        loadingConversations={loading}
        thread={thread}
        threadLoading={threadLoading}
        currentUserId={currentUserId}
        onSend={sendMessage}
        fullHeight={false}
        showTitle={true}
      />
    </div>
  );
}
