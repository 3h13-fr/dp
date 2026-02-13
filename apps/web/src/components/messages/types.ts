export type MessageAttachment = {
  id?: string;
  url: string;
  type: 'image' | 'file';
  filename?: string | null;
};

export type Message = {
  id: string;
  body: string;
  createdAt: string;
  senderId: string | null;
  sender?: { id: string; firstName: string | null; lastName: string | null; avatarUrl?: string | null } | null;
  attachments?: MessageAttachment[];
  isSystem?: boolean;
  senderRole?: 'host' | 'guest';
};

export type Conversation = {
  bookingId: string;
  drivepark?: boolean;
  listing: { id: string; title?: string | null; displayName?: string | null };
  listingFirstPhotoUrl?: string | null;
  listingCity?: string | null;
  bookingStartAt?: string;
  bookingEndAt?: string;
  otherUser: { id: string; firstName: string | null; lastName: string | null; avatarUrl: string | null } | null;
  lastMessage: {
    id: string;
    body: string;
    createdAt: string;
    senderId: string | null;
    attachments?: MessageAttachment[];
  } | null;
  status: string;
};

export type PendingAttachment = {
  url: string;
  type: 'image' | 'file';
  filename?: string;
  preview?: string; // object URL for images
};
