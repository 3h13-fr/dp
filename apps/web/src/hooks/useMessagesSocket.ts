'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getToken } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type IncomingMessage = {
  id: string;
  bookingId: string | null;
  senderId: string;
  sender?: { id: string; firstName: string | null; lastName: string | null; avatarUrl?: string | null } | null;
  body: string;
  attachments?: { id?: string; url: string; type: string; filename?: string | null }[];
  createdAt: string;
  senderRole?: 'host' | 'guest';
};

/**
 * Connect to the messages WebSocket and subscribe to a booking room.
 * When a new message is received for the current bookingId, onMessage is called.
 */
export function useMessagesSocket(bookingId: string | null, onMessage: (msg: IncomingMessage) => void) {
  const socketRef = useRef<Socket | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const socket = io(API_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('message', (payload: IncomingMessage) => {
      if (payload.bookingId === bookingId) {
        onMessageRef.current?.(payload);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !bookingId) return;
    socket.emit('join_booking', { bookingId });
  }, [bookingId]);
}
