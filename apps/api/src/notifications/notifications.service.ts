import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type NotificationWithData = { id: string; type: string; title: string; body: string | null; data: unknown; readAt: Date | null; createdAt: Date };

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async findForUser(userId: string, limit = 50, unreadOnly = false): Promise<unknown[]> {
    const where: { userId: string; readAt?: null } = { userId };
    if (unreadOnly) where.readAt = null;

    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /** Notifications not linked to any booking → "conversation DrivePark" */
  async findForUserGeneral(userId: string, limit = 50): Promise<NotificationWithData[]> {
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit * 2,
      select: { id: true, type: true, title: true, body: true, data: true, readAt: true, createdAt: true },
    });
    const filtered = rows.filter((n) => {
      const data = n.data as Record<string, unknown> | null;
      return !data?.bookingId;
    });
    return filtered.slice(0, limit);
  }

  /** Notifications for one booking → shown in that reservation's conversation */
  async findForUserByBooking(userId: string, bookingId: string, limit = 50): Promise<NotificationWithData[]> {
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: 500,
      select: { id: true, type: true, title: true, body: true, data: true, readAt: true, createdAt: true },
    });
    const filtered = rows.filter((n) => {
      const data = n.data as Record<string, unknown> | null;
      return data?.bookingId === bookingId;
    });
    return filtered.slice(-limit);
  }

  // TODO: push (FCM/APNs), in-app via WebSocket
}
