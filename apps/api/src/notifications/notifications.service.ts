import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

  // TODO: push (FCM/APNs), in-app via WebSocket
}
