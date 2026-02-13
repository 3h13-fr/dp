import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'database';
import { PrismaService } from '../prisma/prisma.service';
import {
  InspectionType,
  InspectionMode,
  InspectionCreator,
  InspectionStatus,
  ConditionStatus,
  CleanlinessLevel,
  ListingType,
} from 'database';
import { createHash } from 'crypto';
import { CAR_INSPECTION_ITEM_CODES } from './inspection.constants';
import type { CreateInspectionDto } from './dto/create-inspection.dto';
import type { UpdateInspectionDto } from './dto/update-inspection.dto';
import { InspectionScoringService } from './inspection-scoring.service';

@Injectable()
export class InspectionService {
  constructor(
    private prisma: PrismaService,
    private scoring: InspectionScoringService,
  ) {}

  private ensureCarRental(booking: { listing: { type: string } }) {
    if (booking.listing.type !== ListingType.CAR_RENTAL) {
      throw new BadRequestException(
        'Inspection is only required for CAR_RENTAL bookings',
      );
    }
  }

  private ensureCanCreate(
    booking: { hostId: string; guestId: string; listing: { type: string } },
    userId: string,
    type: InspectionType,
    mode: InspectionMode,
    createdBy: InspectionCreator,
    delegated: boolean,
  ) {
    this.ensureCarRental(booking);

    const isHost = booking.hostId === userId;
    const isRenter = booking.guestId === userId;

    if (!isHost && !isRenter) {
      throw new ForbiddenException('Not authorized for this booking');
    }

    if (createdBy === InspectionCreator.HOST && !isHost) {
      throw new ForbiddenException('Only host can create as HOST');
    }
    if (createdBy === InspectionCreator.RENTER && !isRenter) {
      throw new ForbiddenException('Only renter can create as RENTER');
    }

    if (delegated) {
      if (type === InspectionType.DEPART && mode === InspectionMode.BOITE_A_CLES) {
        if (!isRenter) throw new ForbiddenException('Delegation: only renter creates');
      }
      if (type === InspectionType.RETOUR && mode === InspectionMode.BOITE_A_CLES) {
        if (!isRenter) throw new ForbiddenException('Delegation: only renter creates');
      }
    } else {
      if (type === InspectionType.DEPART && !isHost) {
        throw new ForbiddenException('Host creates departure inspection by default');
      }
      if (type === InspectionType.RETOUR && !isHost) {
        throw new ForbiddenException('Host creates return inspection by default');
      }
    }
  }

  private validateCarItems(items: Array<{ itemCode: string; conditionStatus: string; cleanlinessLevel: string; conditionNote?: string; cleanlinessNote?: string; photoUrl?: string }>): string[] {
    const errors: string[] = [];
    const itemCodes = new Set(items.map((i) => i.itemCode));

    for (const code of CAR_INSPECTION_ITEM_CODES) {
      if (!itemCodes.has(code)) {
        errors.push(`Missing required item: ${code}`);
      }
    }

    for (const item of items) {
      if (
        item.conditionStatus !== ConditionStatus.OK &&
        !item.conditionNote?.trim()
      ) {
        errors.push(`conditionNote required for ${item.itemCode} when condition != OK`);
      }
      if (
        (item.cleanlinessLevel === CleanlinessLevel.DIRTY ||
          item.cleanlinessLevel === CleanlinessLevel.VERY_DIRTY) &&
        !item.cleanlinessNote?.trim()
      ) {
        errors.push(`cleanlinessNote required for ${item.itemCode} when dirty`);
      }
      if (!item.photoUrl?.trim()) {
        errors.push(`photoUrl required for ${item.itemCode}`);
      }
    }

    return errors;
  }

  private validateGlobalFields(
    mileageValue: number | null | undefined,
    energyLevelPercent: number | null | undefined,
    documentsPresent: unknown,
    accessoriesChecklist: unknown,
    _type: InspectionType,
  ): string[] {
    const errors: string[] = [];

    if (mileageValue == null) {
      errors.push('mileageValue is required');
    }
    if (energyLevelPercent == null || energyLevelPercent < 0 || energyLevelPercent > 100) {
      errors.push('energyLevelPercent must be 0-100');
    }
    if (!documentsPresent || typeof documentsPresent !== 'object') {
      errors.push('documentsPresent is required');
    }
    if (!accessoriesChecklist || typeof accessoriesChecklist !== 'object') {
      errors.push('accessoriesChecklist is required');
    }

    return errors;
  }

  async create(
    userId: string,
    dto: CreateInspectionDto,
    metadata?: { ip?: string },
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: { listing: true, inspections: { where: { type: dto.type } } },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.inspections.length > 0) {
      throw new BadRequestException(`Inspection ${dto.type} already exists for this booking`);
    }

    this.ensureCanCreate(
      booking,
      userId,
      dto.type,
      dto.mode,
      dto.createdBy,
      dto.delegated ?? false,
    );

    const meta = {
      timestamp: new Date().toISOString(),
      ip: metadata?.ip,
      ...dto.metadata,
    };

    const items = dto.items ?? [];
    const itemRecords = items.map((item, idx) => ({
      itemCode: item.itemCode,
      photoStepCode: item.photoStepCode,
      photoUrl: item.photoUrl ?? null,
      conditionStatus: item.conditionStatus,
      conditionNote: item.conditionNote ?? null,
      cleanlinessLevel: item.cleanlinessLevel,
      cleanlinessNote: item.cleanlinessNote ?? null,
      detailCloseups: (item.detailCloseups ?? undefined) as Prisma.InputJsonValue | undefined,
      order: idx,
    }));

    const inspection = await this.prisma.inspection.create({
      data: {
        bookingId: dto.bookingId,
        type: dto.type,
        mode: dto.mode,
        createdBy: dto.createdBy,
        delegated: dto.delegated ?? false,
        status: InspectionStatus.DRAFT,
        mileageValue: dto.mileageValue ?? null,
        energyLevelPercent: dto.energyLevelPercent ?? null,
        documentsPresent: (dto.documentsPresent ?? undefined) as Prisma.InputJsonValue | undefined,
        accessoriesChecklist: (dto.accessoriesChecklist ?? undefined) as Prisma.InputJsonValue | undefined,
        dashboardWarnings: (dto.dashboardWarnings ?? undefined) as Prisma.InputJsonValue | undefined,
        metadata: meta,
        items: {
          create: itemRecords,
        },
      },
      include: { items: { orderBy: { order: 'asc' } } },
    });

    await this.prisma.inspectionTimelineEvent.create({
      data: {
        bookingId: dto.bookingId,
        eventType: 'inspection_created',
        payload: {
          inspectionId: inspection.id,
          type: dto.type,
          createdBy: dto.createdBy,
        },
      },
    });

    return inspection;
  }

  async findOne(id: string, userId?: string) {
    const inspection = await this.prisma.inspection.findUnique({
      where: { id },
      include: {
        booking: {
          include: { listing: true, guest: true, host: true },
        },
        items: { orderBy: { order: 'asc' } },
      },
    });

    if (!inspection) throw new NotFoundException('Inspection not found');

    if (userId) {
      const { hostId, guestId } = inspection.booking;
      if (hostId !== userId && guestId !== userId) {
        throw new ForbiddenException('Not authorized');
      }
    }

    return inspection;
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

    const inspections = await this.prisma.inspection.findMany({
      where: { bookingId },
      include: { items: { orderBy: { order: 'asc' } } },
      orderBy: { type: 'asc' },
    });

    return inspections;
  }

  async update(id: string, userId: string, dto: UpdateInspectionDto) {
    const inspection = await this.prisma.inspection.findUnique({
      where: { id },
      include: { booking: { include: { listing: true } } },
    });

    if (!inspection) throw new NotFoundException('Inspection not found');
    if (inspection.status !== InspectionStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT inspections can be updated');
    }

    this.ensureCarRental(inspection.booking);
    const { hostId, guestId } = inspection.booking;
    if (hostId !== userId && guestId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    const data: Record<string, unknown> = {};
    if (dto.mileageValue != null) data.mileageValue = dto.mileageValue;
    if (dto.energyLevelPercent != null) data.energyLevelPercent = dto.energyLevelPercent;
    if (dto.documentsPresent != null) data.documentsPresent = dto.documentsPresent;
    if (dto.accessoriesChecklist != null) data.accessoriesChecklist = dto.accessoriesChecklist;
    if (dto.dashboardWarnings != null) data.dashboardWarnings = dto.dashboardWarnings;

    if (dto.items != null) {
      await this.prisma.inspectionItem.deleteMany({ where: { inspectionId: id } });
      data.items = {
        create: dto.items.map((item, idx) => ({
          itemCode: item.itemCode,
          photoStepCode: item.photoStepCode,
          photoUrl: item.photoUrl ?? null,
          conditionStatus: item.conditionStatus,
          conditionNote: item.conditionNote ?? null,
          cleanlinessLevel: item.cleanlinessLevel,
          cleanlinessNote: item.cleanlinessNote ?? null,
          detailCloseups: item.detailCloseups ?? null,
          order: idx,
        })),
      };
    }

    return this.prisma.inspection.update({
      where: { id },
      data: data as never,
      include: { items: { orderBy: { order: 'asc' } } },
    });
  }

  async submit(id: string, userId: string) {
    const inspection = await this.prisma.inspection.findUnique({
      where: { id },
      include: { booking: { include: { listing: true } }, items: true },
    });

    if (!inspection) throw new NotFoundException('Inspection not found');
    if (inspection.status !== InspectionStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT inspections can be submitted');
    }

    this.ensureCarRental(inspection.booking);
    const { hostId, guestId } = inspection.booking;
    if (hostId !== userId && guestId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    const itemErrors = this.validateCarItems(
      inspection.items.map((i) => ({
        itemCode: i.itemCode,
        conditionStatus: i.conditionStatus,
        cleanlinessLevel: i.cleanlinessLevel,
        conditionNote: i.conditionNote ?? undefined,
        cleanlinessNote: i.cleanlinessNote ?? undefined,
        photoUrl: i.photoUrl ?? undefined,
      })),
    );

    const globalErrors = this.validateGlobalFields(
      inspection.mileageValue,
      inspection.energyLevelPercent,
      inspection.documentsPresent,
      inspection.accessoriesChecklist,
      inspection.type,
    );

    const allErrors = [...itemErrors, ...globalErrors];
    if (allErrors.length > 0) {
      throw new BadRequestException(allErrors.join('; '));
    }

    return this.prisma.inspection.update({
      where: { id },
      data: { status: InspectionStatus.SUBMITTED },
      include: { items: { orderBy: { order: 'asc' } } },
    });
  }

  async validate(id: string, userId: string) {
    const inspection = await this.prisma.inspection.findUnique({
      where: { id },
      include: { booking: { include: { listing: true } }, items: true },
    });

    if (!inspection) throw new NotFoundException('Inspection not found');
    if (inspection.status !== InspectionStatus.SUBMITTED) {
      throw new BadRequestException('Only SUBMITTED inspections can be validated');
    }

    this.ensureCarRental(inspection.booking);

    const { hostId, guestId } = inspection.booking;
    const isHost = hostId === userId;
    const isRenter = guestId === userId;

    if (!isHost && !isRenter) throw new ForbiddenException('Not authorized');

    const creatorIsHost = inspection.createdBy === InspectionCreator.HOST;
    if (creatorIsHost && !isRenter) {
      throw new BadRequestException('Renter must validate inspection created by host');
    }
    if (!creatorIsHost && !isHost) {
      throw new BadRequestException('Host must validate inspection created by renter');
    }

    if (inspection.type === InspectionType.RETOUR) {
      const departInspection = await this.prisma.inspection.findFirst({
        where: { bookingId: inspection.bookingId, type: InspectionType.DEPART },
      });
      if (departInspection?.mileageValue != null && inspection.mileageValue != null) {
        if (inspection.mileageValue < departInspection.mileageValue) {
          await this.prisma.inspection.update({
            where: { id },
            data: {
              metadata: {
                ...(inspection.metadata as object ?? {}),
                mileageInconsistency: true,
              },
            },
          });
        }
      }
    }

    const contentHash = this.computeContentHash(inspection);
    const updated = await this.prisma.inspection.update({
      where: { id },
      data: {
        status: InspectionStatus.VALIDATED,
        contentHash,
        validatedAt: new Date(),
      },
      include: { items: { orderBy: { order: 'asc' } } },
    });

    await this.prisma.inspectionTimelineEvent.create({
      data: {
        bookingId: inspection.bookingId,
        eventType: 'inspection_validated',
        payload: { inspectionId: id, validatedBy: userId },
      },
    });

    await this.scoring.storeInspectionScores(
      inspection.bookingId,
      id,
      updated as never,
      inspection.booking.hostId,
      inspection.booking.guestId,
      inspection.booking.startAt,
    );

    return updated;
  }

  async contest(id: string, userId: string, note?: string) {
    const inspection = await this.prisma.inspection.findUnique({
      where: { id },
      include: { booking: { include: { listing: true } } },
    });

    if (!inspection) throw new NotFoundException('Inspection not found');
    if (inspection.status !== InspectionStatus.SUBMITTED) {
      throw new BadRequestException('Only SUBMITTED inspections can be contested');
    }

    this.ensureCarRental(inspection.booking);
    const { hostId, guestId } = inspection.booking;
    if (hostId !== userId && guestId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    const creatorIsHost = inspection.createdBy === InspectionCreator.HOST;
    if (creatorIsHost && hostId === userId) {
      throw new BadRequestException('Creator cannot contest own inspection');
    }
    if (!creatorIsHost && guestId === userId) {
      throw new BadRequestException('Creator cannot contest own inspection');
    }

    const updated = await this.prisma.inspection.update({
      where: { id },
      data: {
        status: InspectionStatus.CONTESTED,
        metadata: {
          ...(inspection.metadata as object ?? {}),
          contestNote: note,
          contestedBy: userId,
        },
      },
      include: { items: { orderBy: { order: 'asc' } } },
    });

    await this.prisma.inspectionTimelineEvent.create({
      data: {
        bookingId: inspection.bookingId,
        eventType: 'inspection_contested',
        payload: { inspectionId: id, contestedBy: userId, note },
      },
    });

    return updated;
  }

  private computeContentHash(inspection: { items: Array<{ photoUrl: string | null; itemCode: string }>; mileageValue: number | null; energyLevelPercent: number | null }): string {
    const parts = inspection.items
      .map((i) => `${i.itemCode}:${i.photoUrl ?? ''}`)
      .concat([
        `mileage:${inspection.mileageValue ?? ''}`,
        `energy:${inspection.energyLevelPercent ?? ''}`,
      ])
      .sort()
      .join('|');
    return createHash('sha256').update(parts).digest('hex');
  }

  getDepartInspectionValidated(bookingId: string): Promise<{ id: string } | null> {
    return this.prisma.inspection.findFirst({
      where: { bookingId, type: InspectionType.DEPART, status: InspectionStatus.VALIDATED },
      select: { id: true },
    });
  }

  getReturnInspectionValidated(bookingId: string): Promise<{ id: string; validatedAt: Date | null } | null> {
    return this.prisma.inspection.findFirst({
      where: { bookingId, type: InspectionType.RETOUR, status: InspectionStatus.VALIDATED },
      select: { id: true, validatedAt: true },
    });
  }
}
