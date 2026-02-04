import { BadRequestException, Injectable } from '@nestjs/common';
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

  /** Send message and emit to booking room for real-time delivery */
  async sendMessage(senderId: string, receiverId: string, body: string, bookingId?: string) {
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
    this.events.emitMessageToBooking(bookingId ?? null, payload);
    await this.queue.enqueueNotification(
      receiverId,
      'new_message',
      'New message',
      body.slice(0, 80),
      { messageId: message.id, senderId, bookingId: bookingId ?? undefined },
    );
    return message;
  }
}
