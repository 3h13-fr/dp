import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
    private queue: QueueService,
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

  /** Thread for one booking (guest + host only). One reservation = one private conversation. */
  async findThreadByBooking(bookingId: string, userId: string) {
    await this.assertParticipant(bookingId, userId);
    return this.prisma.message.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
  }

  /** List conversations: bookings where user is guest or host, with last message and other user. */
  async findConversations(userId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { OR: [{ guestId: userId }, { hostId: userId }] },
      orderBy: { updatedAt: 'desc' },
      include: {
        listing: { select: { id: true, title: true } },
        guest: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        host: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });
    return bookings.map((b) => {
      const otherUser = b.guestId === userId ? b.host : b.guest;
      const lastMessage = b.messages[0];
      return {
        bookingId: b.id,
        listing: b.listing,
        otherUser: otherUser ? { id: otherUser.id, firstName: otherUser.firstName, lastName: otherUser.lastName, avatarUrl: otherUser.avatarUrl } : null,
        lastMessage: lastMessage
          ? { id: lastMessage.id, body: lastMessage.body, createdAt: lastMessage.createdAt, senderId: lastMessage.senderId }
          : null,
        status: b.status,
      };
    });
  }

  /** Send message in a booking thread. Receiver is the other party (host or guest). */
  async sendMessageForBooking(senderId: string, bookingId: string, body: string) {
    const booking = await this.assertParticipant(bookingId, senderId);
    const receiverId = booking.guestId === senderId ? booking.hostId : booking.guestId;

    const message = await this.prisma.message.create({
      data: { senderId, receiverId, body, bookingId },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
    const payload = {
      id: message.id,
      bookingId: message.bookingId,
      senderId: message.senderId,
      sender: message.sender,
      body: message.body,
      createdAt: message.createdAt,
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
