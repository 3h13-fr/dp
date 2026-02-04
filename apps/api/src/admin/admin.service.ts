import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from 'database';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getUsers(limit = 50, offset = 0, role?: Role): Promise<{ items: unknown[]; total: number }> {
    const where = role ? { role } : {};
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          role: true,
          firstName: true,
          lastName: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total };
  }

  async getAuditLogs(limit = 100, offset = 0, resource?: string): Promise<{ items: unknown[]; total: number }> {
    const where = resource ? { resource } : {};
    const items = await this.prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
    const total = await this.prisma.auditLog.count({ where });
    return { items, total };
  }

  async updateListingStatus(
    listingId: string,
    status: string,
    adminUserId?: string,
    ip?: string,
  ): Promise<unknown> {
    const previous = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { status: true },
    });
    const listing = await this.prisma.listing.update({
      where: { id: listingId },
      data: { status },
    });
    if (adminUserId) {
      await this.prisma.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'listing_status_update',
          resource: 'Listing',
          resourceId: listingId,
          metadata: {
            previousStatus: previous?.status ?? null,
            newStatus: status,
          } as object,
          ip,
        },
      });
    }
    return listing;
  }

  async getListingsForModeration(limit = 50, offset = 0, status?: string): Promise<{ items: unknown[]; total: number }> {
    const where = status ? { status } : {};
    const [items, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        include: {
          host: { select: { id: true, email: true, firstName: true, lastName: true } },
          photos: { take: 3 },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.listing.count({ where }),
    ]);
    return { items, total };
  }
}
