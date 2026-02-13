import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DamageClaimStatus, ListingType, InspectionType, InspectionStatus, Prisma } from 'database';
import { Decimal } from 'database';
import { DAMAGE_CLAIM_QUOTE_THRESHOLD } from '../inspection/inspection.constants';
import { InspectionScoringService } from '../inspection/inspection-scoring.service';
import type { CreateDamageClaimDto } from './dto/create-damage-claim.dto';
import type { UpdateDamageClaimDto } from './dto/update-damage-claim.dto';

@Injectable()
export class DamageClaimService {
  constructor(
    private prisma: PrismaService,
    private scoring: InspectionScoringService,
  ) {}

  private ensureCarRental(booking: { listing: { type: string } }) {
    if (booking.listing.type !== ListingType.CAR_RENTAL) {
      throw new BadRequestException(
        'Damage claims are only for CAR_RENTAL bookings',
      );
    }
  }

  private ensureWithin24h(validatedAt: Date | null) {
    if (!validatedAt) return false;
    const now = new Date();
    const diffMs = now.getTime() - validatedAt.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours <= 24;
  }

  async create(userId: string, dto: CreateDamageClaimDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: {
        listing: true,
        inspections: {
          where: { type: InspectionType.RETOUR, status: InspectionStatus.VALIDATED },
          orderBy: { validatedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.hostId !== userId) {
      throw new ForbiddenException('Only host can create damage claims');
    }

    this.ensureCarRental(booking);

    const returnInspection = booking.inspections[0];
    if (!returnInspection) {
      throw new BadRequestException(
        'Return inspection must be validated before creating a damage claim',
      );
    }

    if (!this.ensureWithin24h(returnInspection.validatedAt)) {
      throw new BadRequestException(
        'Damage claim must be created within 24 hours of return inspection validation',
      );
    }

    const existingClaim = await this.prisma.damageClaim.findFirst({
      where: { bookingId: dto.bookingId, status: { not: DamageClaimStatus.CLOSED } },
    });
    if (existingClaim) {
      throw new BadRequestException('A damage claim already exists for this booking');
    }

    if (!dto.departPhotoUrl?.trim() || !dto.returnPhotoUrl?.trim()) {
      throw new BadRequestException('Comparative photos (depart and return) are required');
    }

    if (
      dto.amountRequested > DAMAGE_CLAIM_QUOTE_THRESHOLD &&
      !dto.quoteUrl?.trim()
    ) {
      throw new BadRequestException(
        `Quote is required when amount exceeds ${DAMAGE_CLAIM_QUOTE_THRESHOLD}€`,
      );
    }

    return this.prisma.damageClaim.create({
      data: {
        bookingId: dto.bookingId,
        createdBy: userId,
        status: DamageClaimStatus.DRAFT,
        category: dto.category,
        zoneCoords: (dto.zoneCoords ?? undefined) as Prisma.InputJsonValue | undefined,
        amountRequested: new Decimal(dto.amountRequested),
        justification: dto.justification,
        quoteUrl: dto.quoteUrl ?? null,
        departPhotoUrl: dto.departPhotoUrl,
        returnPhotoUrl: dto.returnPhotoUrl,
      },
    });
  }

  async findOne(id: string, userId?: string) {
    const claim = await this.prisma.damageClaim.findUnique({
      where: { id },
      include: {
        booking: {
          include: { listing: true, guest: true, host: true },
        },
      },
    });

    if (!claim) throw new NotFoundException('Damage claim not found');

    if (userId) {
      const { hostId, guestId } = claim.booking;
      if (hostId !== userId && guestId !== userId) {
        throw new ForbiddenException('Not authorized');
      }
    }

    return claim;
  }

  async findForBooking(bookingId: string, userId?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { listing: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    if (userId) {
      if (booking.hostId !== userId && booking.guestId !== userId) {
        throw new ForbiddenException('Not authorized');
      }
    }

    return this.prisma.damageClaim.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, userId: string, dto: UpdateDamageClaimDto) {
    const claim = await this.prisma.damageClaim.findUnique({
      where: { id },
      include: { booking: { include: { listing: true } } },
    });

    if (!claim) throw new NotFoundException('Damage claim not found');
    if (claim.status !== DamageClaimStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT claims can be updated');
    }
    if (claim.createdBy !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    this.ensureCarRental(claim.booking);

    const data: Record<string, unknown> = {};
    if (dto.category != null) data.category = dto.category;
    if (dto.zoneCoords != null) data.zoneCoords = dto.zoneCoords;
    if (dto.amountRequested != null) data.amountRequested = new Decimal(dto.amountRequested);
    if (dto.justification != null) data.justification = dto.justification;
    if (dto.quoteUrl != null) data.quoteUrl = dto.quoteUrl;
    if (dto.departPhotoUrl != null) data.departPhotoUrl = dto.departPhotoUrl;
    if (dto.returnPhotoUrl != null) data.returnPhotoUrl = dto.returnPhotoUrl;

    return this.prisma.damageClaim.update({
      where: { id },
      data: data as never,
    });
  }

  async submit(id: string, userId: string) {
    const claim = await this.prisma.damageClaim.findUnique({
      where: { id },
      include: { booking: { include: { listing: true } } },
    });

    if (!claim) throw new NotFoundException('Damage claim not found');
    if (claim.status !== DamageClaimStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT claims can be submitted');
    }
    if (claim.createdBy !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    this.ensureCarRental(claim.booking);

    if (!claim.departPhotoUrl?.trim() || !claim.returnPhotoUrl?.trim()) {
      throw new BadRequestException('Comparative photos are required');
    }

    const amount = claim.amountRequested.toNumber();
    if (amount > DAMAGE_CLAIM_QUOTE_THRESHOLD && !claim.quoteUrl?.trim()) {
      throw new BadRequestException('Quote is required when amount exceeds threshold');
    }

    const updated = await this.prisma.damageClaim.update({
      where: { id },
      data: {
        status: DamageClaimStatus.AWAITING_RENTER_RESPONSE,
        submittedAt: new Date(),
      },
    });

    await this.prisma.inspectionTimelineEvent.create({
      data: {
        bookingId: claim.bookingId,
        eventType: 'damage_claim_submitted',
        payload: { damageClaimId: id },
      },
    });

    await this.scoring.storeClaimScores(claim.bookingId, id, updated as never);

    return updated;
  }

  async renterRespond(
    id: string,
    userId: string,
    response: 'accept' | 'contest',
    note?: string,
  ) {
    const claim = await this.prisma.damageClaim.findUnique({
      where: { id },
      include: { booking: { include: { listing: true } } },
    });

    if (!claim) throw new NotFoundException('Damage claim not found');
    if (claim.status !== DamageClaimStatus.AWAITING_RENTER_RESPONSE) {
      throw new BadRequestException('Claim is not awaiting renter response');
    }
    if (claim.booking.guestId !== userId) {
      throw new ForbiddenException('Only renter can respond');
    }

    this.ensureCarRental(claim.booking);

    const updated = await this.prisma.damageClaim.update({
      where: { id },
      data: {
        status: DamageClaimStatus.AWAITING_ADMIN_REVIEW,
        renterResponse: response,
        renterResponseAt: new Date(),
      },
    });

    await this.prisma.inspectionTimelineEvent.create({
      data: {
        bookingId: claim.bookingId,
        eventType: 'damage_claim_renter_responded',
        payload: { damageClaimId: id, response, note },
      },
    });

    return updated;
  }
}
