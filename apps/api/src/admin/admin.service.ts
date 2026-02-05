import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, BookingStatus } from 'database';

/** Known API keys / tokens that admins can set. Add new keys here and in ADMIN_SETTINGS_KEYS. */
export const ADMIN_SETTINGS_KEYS = [
  { key: 'STRIPE_SECRET_KEY', label: 'Stripe Secret Key', category: 'stripe', secret: true },
  { key: 'STRIPE_WEBHOOK_SECRET', label: 'Stripe Webhook Secret', category: 'stripe', secret: true },
  { key: 'STRIPE_PUBLISHABLE_KEY', label: 'Stripe Publishable Key', category: 'stripe', secret: false },
  { key: 'GOOGLE_CLIENT_ID', label: 'Google Client ID', category: 'google', secret: false },
  { key: 'GOOGLE_CLIENT_SECRET', label: 'Google Client Secret', category: 'google', secret: true },
  { key: 'APPLE_CLIENT_ID', label: 'Apple Client ID (Service ID)', category: 'apple', secret: false },
  { key: 'APPLE_CLIENT_SECRET', label: 'Apple Client Secret / Key', category: 'apple', secret: true },
  { key: 'APPLE_TEAM_ID', label: 'Apple Team ID', category: 'apple', secret: false },
  { key: 'APPLE_KEY_ID', label: 'Apple Key ID', category: 'apple', secret: false },
  { key: 'SMTP_HOST', label: 'SMTP Host', category: 'smtp', secret: false },
  { key: 'SMTP_PORT', label: 'SMTP Port', category: 'smtp', secret: false },
  { key: 'SMTP_USER', label: 'SMTP User', category: 'smtp', secret: false },
  { key: 'SMTP_PASS', label: 'SMTP Password', category: 'smtp', secret: true },
  { key: 'SMTP_FROM', label: 'SMTP From (sender email)', category: 'smtp', secret: false },
] as const;

function maskValue(value: string, isSecret: boolean): string {
  if (!value || value.length === 0) return '';
  if (!isSecret) return value;
  if (value.length <= 8) return '••••••••';
  return value.slice(0, 4) + '••••••••' + value.slice(-4);
}

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

  async getListingById(id: string): Promise<unknown> {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: {
        host: { select: { id: true, email: true, firstName: true, lastName: true } },
        photos: { orderBy: { order: 'asc' } },
        vehicle: {
          include: {
            make: { select: { id: true, name: true, slug: true } },
            model: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    const displayTitle = (listing.displayName ?? listing.title ?? '').toString().trim() || '—';
    return { ...listing, displayTitle };
  }

  async getBookings(
    limit = 50,
    offset = 0,
    status?: string,
  ): Promise<{ items: unknown[]; total: number }> {
    const where = status ? { status: status as BookingStatus } : {};
    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          listing: { select: { id: true, title: true, displayName: true, type: true, slug: true } },
          guest: { select: { id: true, firstName: true, lastName: true, email: true } },
          host: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { startAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.booking.count({ where }),
    ]);
    return { items, total };
  }

  /** Get all admin settings (API keys, etc.) with masked secret values. */
  async getSettings(): Promise<{ items: { key: string; label: string; category: string; valueMasked: string; hasValue: boolean }[] }> {
    const stored = await this.prisma.setting.findMany({
      where: { key: { in: ADMIN_SETTINGS_KEYS.map((k) => k.key) } },
    });
    const byKey = new Map(stored.map((s) => [s.key, s.value]));
    const items = ADMIN_SETTINGS_KEYS.map((def) => {
      const value = byKey.get(def.key) ?? '';
      return {
        key: def.key,
        label: def.label,
        category: def.category,
        valueMasked: maskValue(value, def.secret),
        hasValue: value.length > 0,
      };
    });
    return { items };
  }

  /** Update one or more settings. Only provided keys are updated. */
  async updateSettings(updates: { key: string; value: string }[]): Promise<{ updated: number }> {
    let updated = 0;
    for (const { key, value } of updates) {
      const allowed = ADMIN_SETTINGS_KEYS.some((k) => k.key === key);
      if (!allowed) continue;
      await this.prisma.setting.upsert({
        where: { key },
        create: { key, value, category: ADMIN_SETTINGS_KEYS.find((k) => k.key === key)?.category ?? null },
        update: { value },
      });
      updated++;
    }
    return { updated };
  }
}
