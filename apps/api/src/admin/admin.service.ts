import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { VehicleService } from '../vehicles/vehicle.service';
import { AdminMarketsService } from './admin-markets.service';
import { Role, BookingStatus } from 'database';
import { Prisma } from 'database';

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
  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
    private vehicleService: VehicleService,
    private marketsService: AdminMarketsService,
  ) {}

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
    reason?: string,
  ): Promise<unknown> {
    // 1. Récupérer le listing avec hostId, titre et country
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { status: true, hostId: true, displayName: true, title: true, country: true },
    });
    if (!listing) throw new NotFoundException('Listing not found');

    const previousStatus = listing.status;

    // When activating: verify Market exists, is ACTIVE and visibleToClient
    if (status === 'ACTIVE' && previousStatus !== 'ACTIVE') {
      const countryRaw = listing.country?.trim();
      if (!countryRaw) {
        throw new BadRequestException('Marché non ouvert : l\'annonce doit avoir un pays renseigné pour être publiée.');
      }
      const market = await this.marketsService.findByCountryCode(countryRaw);
      if (!market || market.status !== 'ACTIVE' || !market.visibleToClient) {
        throw new BadRequestException('Marché non ouvert, annonce enregistrée mais non publiable. Le pays doit être configuré et visible côté client.');
      }
    }

    // 2. Mettre à jour le statut
    const updated = await this.prisma.listing.update({
      where: { id: listingId },
      data: { status },
    });

    // 3. Créer audit log avec raison
    if (adminUserId) {
      await this.prisma.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'listing_status_update',
          resource: 'Listing',
          resourceId: listingId,
          metadata: {
            previousStatus,
            newStatus: status,
            reason: reason || null,
          } as object,
          ip,
        },
      });
    }

    // 4. Envoyer notification au host
    const listingTitle = (listing.displayName || listing.title || 'Votre annonce').toString().trim();
    let notificationType: string | null = null;
    let notificationTitle = '';
    let notificationBody = '';

    if (status === 'ACTIVE' && previousStatus !== 'ACTIVE') {
      notificationType = 'listing_approved';
      notificationTitle = 'Votre annonce a été approuvée';
      notificationBody = `Votre annonce "${listingTitle}" est maintenant visible publiquement.`;
    } else if (status === 'SUSPENDED') {
      notificationType = 'listing_suspended';
      notificationTitle = 'Votre annonce a été suspendue';
      notificationBody = `Votre annonce "${listingTitle}" a été suspendue.${reason ? ` Raison : ${reason}` : ''}`;
    } else if (status === 'DRAFT' && (previousStatus === 'PENDING' || previousStatus === 'ACTIVE')) {
      notificationType = 'listing_rejected';
      notificationTitle = 'Votre annonce a été rejetée';
      notificationBody = `Votre annonce "${listingTitle}" a été rejetée.${reason ? ` Raison : ${reason}` : ''}`;
    }

    if (notificationType) {
      await this.queueService.addNotification({
        userId: listing.hostId,
        type: notificationType,
        title: notificationTitle,
        body: notificationBody,
        data: {
          listingId,
          listingTitle,
          reason: reason || undefined,
        },
      });
    }

    return updated;
  }

  async getListingsForModeration(limit = 50, offset = 0, status?: string, type?: string): Promise<{ items: unknown[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (type) where.type = type;
    
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
        categories: { include: { category: { select: { id: true, name: true, slug: true } } } },
      },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    const displayTitle = (listing.displayName ?? listing.title ?? '').toString().trim() || '—';
    return { ...listing, displayTitle };
  }

  private async assertMarketAllowsActivation(country: string | null | undefined): Promise<void> {
    const countryRaw = country?.trim();
    if (!countryRaw) {
      throw new BadRequestException('Marché non ouvert : l\'annonce doit avoir un pays renseigné pour être publiée.');
    }
    const market = await this.marketsService.findByCountryCode(countryRaw);
    if (!market || market.status !== 'ACTIVE' || !market.visibleToClient) {
      throw new BadRequestException('Marché non ouvert, annonce enregistrée mais non publiable. Le pays doit être configuré et visible côté client.');
    }
  }

  async updateListing(
    id: string,
    data: {
      description?: string | null;
      pricePerDay?: number | null;
      currency?: string;
      caution?: number | null;
      status?: string;
      options?: Record<string, unknown> | null;
      // Location fields
      address?: string | null;
      city?: string | null;
      country?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      // Booking rules
      minBookingNoticeHours?: number | null;
      maxBookingAdvanceDays?: number | null;
      instantBooking?: boolean;
      manualApprovalRequired?: boolean;
      minRentalDurationHours?: number | null;
      maxRentalDurationDays?: number | null;
      autoAcceptBookings?: boolean;
      // Renter conditions
      minDriverAge?: number | null;
      minLicenseYears?: number | null;
      categoryIds?: string[] | null; // Array of category IDs
    },
  ): Promise<unknown> {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      select: { id: true, country: true },
    });
    if (!listing) throw new NotFoundException('Listing not found');

    // When setting status to ACTIVE, verify Market
    if (data.status === 'ACTIVE') {
      const countryToCheck = data.country ?? listing.country;
      await this.assertMarketAllowsActivation(countryToCheck);
    }

    const updateData: Prisma.ListingUpdateInput = {};
    if (data.description !== undefined) updateData.description = data.description;
    if (data.pricePerDay !== undefined) updateData.pricePerDay = data.pricePerDay;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.caution !== undefined) updateData.caution = data.caution;
    // Admins can set any status
    if (data.status !== undefined) updateData.status = data.status;
    if (data.options !== undefined) {
      updateData.options = data.options === null ? Prisma.JsonNull : (data.options as Prisma.InputJsonValue);
    }
    if (data.address !== undefined) updateData.address = data.address;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.latitude !== undefined) updateData.latitude = data.latitude;
    if (data.longitude !== undefined) updateData.longitude = data.longitude;
    if (data.minBookingNoticeHours !== undefined) updateData.minBookingNoticeHours = data.minBookingNoticeHours;
    if (data.maxBookingAdvanceDays !== undefined) updateData.maxBookingAdvanceDays = data.maxBookingAdvanceDays;
    if (data.instantBooking !== undefined) updateData.instantBooking = data.instantBooking;
    if (data.manualApprovalRequired !== undefined) updateData.manualApprovalRequired = data.manualApprovalRequired;
    if (data.minRentalDurationHours !== undefined) updateData.minRentalDurationHours = data.minRentalDurationHours;
    if (data.maxRentalDurationDays !== undefined) updateData.maxRentalDurationDays = data.maxRentalDurationDays;
    if (data.autoAcceptBookings !== undefined) updateData.autoAcceptBookings = data.autoAcceptBookings;
    if (data.minDriverAge !== undefined) updateData.minDriverAge = data.minDriverAge;
    if (data.minLicenseYears !== undefined) updateData.minLicenseYears = data.minLicenseYears;
    if (data.categoryIds !== undefined) {
      // Replace all categories with the new ones
      updateData.categories = {
        deleteMany: {}, // Remove all existing categories
        create: data.categoryIds && data.categoryIds.length > 0
          ? data.categoryIds.map((categoryId) => ({
              category: { connect: { id: categoryId } },
            }))
          : [],
      };
    }

    const updated = await this.prisma.listing.update({
      where: { id },
      data: updateData,
      include: {
        photos: { orderBy: { order: 'asc' } },
        host: { select: { id: true, email: true, firstName: true, lastName: true } },
        vehicle: {
          include: {
            make: { select: { id: true, name: true, slug: true } },
            model: { select: { id: true, name: true, slug: true } },
          },
        },
        categories: { include: { category: { select: { id: true, name: true, slug: true } } } },
      },
    });
    const displayTitle = (updated.displayName ?? updated.title ?? '').toString().trim() || '—';
    return { ...updated, displayTitle };
  }

  async updateListingVehicle(
    listingId: string,
    data: {
      powerCv?: number | null;
      batteryKwh?: number | null;
      topSpeedKmh?: number | null;
      zeroTo100S?: number | null;
      powerKw?: number | null;
      registrationCountry?: string | null;
      licensePlate?: string | null;
      fiscalPower?: number | null;
      ownerType?: 'PARTICULAR' | 'PROFESSIONAL' | null;
    },
  ): Promise<unknown> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, vehicleId: true },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (!listing.vehicleId) throw new BadRequestException('Listing has no vehicle');

    const updated = await this.vehicleService.updateVehicleSpecsAndAdmin(listing.vehicleId, {
      ...data,
      ownerType: data.ownerType as never,
    });
    return updated;
  }

  async addPhoto(listingId: string, url: string, order?: number): Promise<unknown> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true },
    });
    if (!listing) throw new NotFoundException('Listing not found');

    const maxOrder = await this.prisma.listingPhoto.findFirst({
      where: { listingId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const photoOrder = order ?? (maxOrder?.order ?? -1) + 1;

    const photo = await this.prisma.listingPhoto.create({
      data: {
        listingId,
        url,
        order: photoOrder,
      },
    });

    return photo;
  }

  async removePhoto(listingId: string, photoId: string): Promise<void> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true },
    });
    if (!listing) throw new NotFoundException('Listing not found');

    const photo = await this.prisma.listingPhoto.findUnique({
      where: { id: photoId },
      select: { listingId: true },
    });
    if (!photo || photo.listingId !== listingId) {
      throw new NotFoundException('Photo not found');
    }

    await this.prisma.listingPhoto.delete({
      where: { id: photoId },
    });
  }

  async reorderPhotos(listingId: string, photoIds: string[]): Promise<void> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true },
    });
    if (!listing) throw new NotFoundException('Listing not found');

    // Verify all photos belong to this listing
    const photos = await this.prisma.listingPhoto.findMany({
      where: { listingId, id: { in: photoIds } },
      select: { id: true },
    });
    if (photos.length !== photoIds.length) {
      throw new BadRequestException('Some photos do not belong to this listing');
    }

    // Update order for each photo
    await Promise.all(
      photoIds.map((photoId, index) =>
        this.prisma.listingPhoto.update({
          where: { id: photoId },
          data: { order: index },
        }),
      ),
    );
  }

  async getBookingDetail(bookingId: string): Promise<unknown> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        listing: { include: { photos: { orderBy: { order: 'asc' } } } },
        guest: { select: { id: true, firstName: true, lastName: true, email: true } },
        host: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        review: { select: { id: true, rating: true, comment: true, createdAt: true } },
        payments: { select: { id: true, status: true, amount: true, currency: true, type: true } },
        inspections: { include: { items: { orderBy: { order: 'asc' } } } },
        damageClaims: true,
        deposit: { include: { payment: true } },
        inspectionTimeline: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const scorings = await this.prisma.inspectionScoring.findMany({
      where: { bookingId },
      orderBy: { computedAt: 'desc' },
    });

    return { ...booking, scorings };
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
