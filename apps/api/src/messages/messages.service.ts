import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { QueueService } from '../queue/queue.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
    private queue: QueueService,
    private notifications: NotificationsService,
  ) {}

  /** Ensure user is guest or host of the booking */
  private async assertParticipant(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, guestId: true, hostId: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.guestId !== userId && booking.hostId !== userId) {
      throw new ForbiddenException('Not a participant of this booking');
    }
    return booking;
  }

  /** Thread for one booking (guest + host only). Messages + notifications linked to this reservation. */
  async findThreadByBooking(bookingId: string, userId: string) {
    const booking = await this.assertParticipant(bookingId, userId);
    const [messages, bookingNotifications] = await Promise.all([
      this.prisma.message.findMany({
        where: { bookingId },
        orderBy: { createdAt: 'asc' },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          attachments: true,
        },
      }),
      this.notifications.findForUserByBooking(userId, bookingId),
    ]);
    const messageItems = messages.map((m) => ({
      ...m,
      isSystem: false as const,
      senderRole: m.senderId === booking.hostId ? ('host' as const) : ('guest' as const),
    }));
    const notificationItems = bookingNotifications.map((n) => ({
      id: `notif-${n.id}`,
      body: [n.title, n.body].filter(Boolean).join(' — ') || n.type,
      createdAt: n.createdAt,
      readAt: n.readAt,
      senderId: null as string | null,
      sender: null,
      isSystem: true as const,
      notificationId: n.id,
    }));
    const combined = [...messageItems, ...notificationItems];
    combined.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return combined;
  }

  /** Notifications not linked to a reservation → conversation DrivePark (read-only thread). */
  async findDriveParkThread(userId: string) {
    const list = await this.notifications.findForUserGeneral(userId);
    return list.map((n) => ({
      id: `notif-${n.id}`,
      body: [n.title, n.body].filter(Boolean).join(' — ') || n.type,
      createdAt: n.createdAt,
      readAt: n.readAt,
      isSystem: true as const,
      notificationId: n.id,
    }));
  }

  /** List conversations: booking threads + one "DrivePark" for general notifications. */
  async findConversations(userId: string) {
    const [bookings, driveParkNotifications] = await Promise.all([
      this.prisma.booking.findMany({
        where: { OR: [{ guestId: userId }, { hostId: userId }] },
        orderBy: { updatedAt: 'desc' },
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              displayName: true,
              city: true,
              photos: { orderBy: { order: 'asc' }, take: 1 },
            },
          },
          guest: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          host: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              sender: { select: { id: true, firstName: true, lastName: true } },
              attachments: true,
            },
          },
        },
      }),
      this.notifications.findForUserGeneral(userId, 1),
    ]);
    const bookingConversations = bookings.map((b) => {
      const otherUser = b.guestId === userId ? b.host : b.guest;
      const lastMessage = b.messages[0];
      const firstPhoto = b.listing.photos?.[0];
      return {
        bookingId: b.id,
        listing: { id: b.listing.id, title: b.listing.title, displayName: b.listing.displayName },
        listingFirstPhotoUrl: firstPhoto?.url ?? null,
        listingCity: b.listing.city ?? null,
        bookingStartAt: b.startAt.toISOString(),
        bookingEndAt: b.endAt.toISOString(),
        otherUser: otherUser ? { id: otherUser.id, firstName: otherUser.firstName, lastName: otherUser.lastName, avatarUrl: otherUser.avatarUrl } : null,
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              body: lastMessage.body,
              createdAt: lastMessage.createdAt,
              senderId: lastMessage.senderId,
              attachments: lastMessage.attachments ?? [],
            }
          : null,
        status: b.status,
      };
    });
    const driveParkLast = driveParkNotifications[0];
    const driveParkConversation = {
      drivepark: true as const,
      bookingId: 'drivepark',
      listing: { id: '', title: 'DrivePark' },
      otherUser: null,
      lastMessage: driveParkLast
        ? { id: `notif-${driveParkLast.id}`, body: [driveParkLast.title, driveParkLast.body].filter(Boolean).join(' — ') || driveParkLast.type, createdAt: driveParkLast.createdAt, senderId: null as string | null }
        : null,
      status: '',
    };
    return [driveParkConversation, ...bookingConversations];
  }

  /** Send message in a booking thread. Receiver is the other party (host or guest). */
  async sendMessageForBooking(
    senderId: string,
    bookingId: string,
    body: string,
    attachmentUrls?: { url: string; type: 'image' | 'file'; filename?: string }[],
  ) {
    const hasBody = typeof body === 'string' && body.trim().length > 0;
    const hasAttachments = attachmentUrls && attachmentUrls.length > 0;
    if (!hasBody && !hasAttachments) {
      throw new BadRequestException('Message must have body or attachments');
    }
    const booking = await this.assertParticipant(bookingId, senderId);
    const receiverId = booking.guestId === senderId ? booking.hostId : booking.guestId;

    const message = await this.prisma.message.create({
      data: {
        senderId,
        receiverId,
        body: body?.trim() ?? '',
        bookingId,
        attachments:
          hasAttachments && attachmentUrls
            ? {
                create: attachmentUrls.map((a) => ({
                  url: a.url,
                  type: a.type,
                  filename: a.filename ?? null,
                })),
              }
            : undefined,
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        attachments: true,
      },
    });
    const senderRole = message.senderId === booking.hostId ? 'host' : 'guest';
    const payload = {
      id: message.id,
      bookingId: message.bookingId,
      senderId: message.senderId,
      sender: message.sender,
      body: message.body,
      attachments: message.attachments,
      createdAt: message.createdAt,
      senderRole,
    };
    this.events.emitMessageToBooking(bookingId, payload);
    await this.queue.enqueueNotification(
      receiverId,
      'new_message',
      'New message',
      body.slice(0, 80),
      { messageId: message.id, senderId, bookingId },
    );
    const receiver = await this.prisma.user.findUnique({
      where: { id: receiverId },
      select: { email: true, preferredLang: true },
    });
    if (receiver?.email) {
      const senderName = [message.sender.firstName, message.sender.lastName].filter(Boolean).join(' ') || 'Someone';
      await this.queue.enqueueNewMessageEmail(
        receiver.email,
        senderName,
        body.slice(0, 80),
        receiver.preferredLang ?? 'en',
      );
    }
    return message;
  }

  /** Legacy: thread by user pair + optional booking (kept for compatibility) */
  async findThread(userId: string, otherUserId: string, bookingId?: string) {
    return this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
        ...(bookingId ? { bookingId } : {}),
      },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
  }
}
