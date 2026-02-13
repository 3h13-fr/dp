'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

export function DisputeMessages({ bookingId }: { bookingId: string }) {
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    apiFetch(`/messages?bookingId=${bookingId}`)
      .then((res) => res.json())
      .then((data) => setMessages(data.items || []))
      .catch(() => {});
  }, [bookingId]);

  return (
    <div className="rounded-lg border border-border p-6">
      <h2 className="mb-4 text-lg font-semibold">Messages</h2>
      {messages.length === 0 ? (
        <p className="text-muted-foreground">No messages</p>
      ) : (
        <div className="space-y-2">
          {messages.map((msg) => (
            <div key={msg.id} className="rounded border border-border p-3">
              <p className="text-sm text-muted-foreground">
                {msg.sender?.email} · {new Date(msg.createdAt).toLocaleString()}
              </p>
              <p className="mt-1">{msg.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
