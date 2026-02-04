'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { apiFetch, getToken } from '@/lib/api';

type Conversation = {
  bookingId: string;
  listing: { id: string; title: string };
  otherUser: { id: string; firstName: string | null; lastName: string | null; avatarUrl: string | null } | null;
  lastMessage: { id: string; body: string; createdAt: string; senderId: string } | null;
  status: string;
};

type Message = {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  sender: { id: string; firstName: string | null; lastName: string | null };
};

export default function MessagesPage() {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const bookingIdParam = searchParams.get('bookingId');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [thread, setThread] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageBody, setMessageBody] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace(`/${locale}/login?redirect=/messages`);
      return;
    }
    apiFetch('/auth/me')
      .then((r) => r.ok ? r.json() : null)
      .then((user) => {
        if (user) setCurrentUserId(user.id);
      });
    apiFetch('/messages/conversations')
      .then((r) => (r.ok ? r.json() : []))
      .then(setConversations)
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, [locale, router]);

  useEffect(() => {
    if (!bookingIdParam || !getToken()) return;
    apiFetch(`/messages/thread?bookingId=${encodeURIComponent(bookingIdParam)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setThread)
      .catch(() => setThread([]));
  }, [bookingIdParam]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingIdParam || !messageBody.trim() || sending) return;
    setSending(true);
    try {
      const res = await apiFetch('/messages/send', {
        method: 'POST',
        body: JSON.stringify({ bookingId: bookingIdParam, body: messageBody.trim() }),
      });
      if (res.ok) {
        const msg = await res.json();
        setThread((prev) => [...prev, msg]);
        setMessageBody('');
      }
    } finally {
      setSending(false);
    }
  };

  const currentConversation = conversations.find((c) => c.bookingId === bookingIdParam);

  if (!getToken()) return null;

  const t = useTranslations('messages');
  const tCommon = useTranslations('common');

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      {loading ? (
        <p className="mt-4 text-muted-foreground">{tCommon('loading')}</p>
      ) : bookingIdParam ? (
        <div className="mt-6">
          <Link
            href={`/${locale}/messages`}
            className="text-sm text-primary underline"
          >
            ← {t('allConversations')}
          </Link>
          {currentConversation && (
            <p className="mt-2 font-medium">
              {currentConversation.listing.title} · {t('with')} {currentConversation.otherUser?.firstName} {currentConversation.otherUser?.lastName}
            </p>
          )}
          <div className="mt-4 space-y-3 rounded-lg border border-border bg-muted/20 p-4 min-h-[200px]">
            {thread.map((msg) => (
              <div
                key={msg.id}
                className={msg.senderId === currentUserId ? 'text-right' : ''}
              >
                <span className="text-xs text-muted-foreground">
                  {msg.sender.firstName} {msg.sender.lastName}
                </span>
                <p className="mt-0.5 rounded-lg bg-background px-3 py-2 text-sm inline-block max-w-[85%] text-left">
                  {msg.body}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(msg.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
          <form onSubmit={sendMessage} className="mt-4 flex gap-2">
            <input
              type="text"
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              placeholder={t('typePlaceholder')}
              className="flex-1 rounded-lg border border-border bg-background px-4 py-2"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !messageBody.trim()}
              className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50"
            >
              {t('send')}
            </button>
          </form>
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {conversations.length === 0 ? (
            <p className="text-muted-foreground">
              No conversations yet. Book a trip to start messaging your host or guest.
            </p>
          ) : (
            conversations.map((c) => (
              <Link
                key={c.bookingId}
                href={`/${locale}/messages?bookingId=${c.bookingId}`}
                className="block rounded-lg border border-border bg-background p-4 hover:bg-muted/30"
              >
                <p className="font-medium">{c.listing.title}</p>
                <p className="text-sm text-muted-foreground">
                  {c.otherUser?.firstName} {c.otherUser?.lastName} · {c.status}
                </p>
                {c.lastMessage && (
                  <p className="mt-1 text-sm truncate text-muted-foreground">
                    {c.lastMessage.body}
                  </p>
                )}
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
