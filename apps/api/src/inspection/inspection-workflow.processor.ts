import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import {
  InspectionStatus,
  InspectionType,
  InspectionMode,
  InspectionCreator,
  DamageClaimStatus,
  DepositStatus,
  ListingType,
  PaymentStatus,
} from 'database';

@Injectable()
export class InspectionWorkflowProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InspectionWorkflowProcessor.name);
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    private prisma: PrismaService,
    private payments: PaymentsService,
  ) {}

  onModuleInit() {
    this.intervalId = setInterval(() => {
      this.run().catch((err) => {
        this.logger.error('Error in inspection workflow processor', err);
      });
    }, 10 * 60 * 1000); // Every 10 minutes

    this.run().catch((err) => {
      this.logger.error('Error on startup', err);
    });
  }

  onModuleDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  async run() {
    await this.autoValidateInspections();
    await this.autoReleaseDepositNoClaim();
    await this.autoAcceptRenterSilence();
    await this.autoReleaseDepositAdminTimeout();
  }

  /** BOITE_A_CLES: RENTER valide DEPART sous 30min, délégation HOST valide sous 12h. RETOUR: silence 24h = auto-validation. */
  async autoValidateInspections() {
    const now = new Date();

    const submittedInspections = await this.prisma.inspection.findMany({
      where: { status: InspectionStatus.SUBMITTED },
      include: {
        booking: {
          include: { listing: { select: { type: true } } },
        },
      },
    });

    for (const insp of submittedInspections) {
      if (insp.booking.listing.type !== ListingType.CAR_RENTAL) continue;

      const createdAt = insp.createdAt;
      const deadline30min = new Date(createdAt.getTime() + 30 * 60 * 1000);
      const deadline12h = new Date(createdAt.getTime() + 12 * 60 * 60 * 1000);
      const deadline24h = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);

      let shouldAutoValidate = false;

      if (insp.type === InspectionType.DEPART && insp.mode === InspectionMode.BOITE_A_CLES) {
        if (insp.delegated && insp.createdBy === InspectionCreator.RENTER) {
          if (now >= deadline12h) shouldAutoValidate = true;
        } else {
          if (now >= deadline30min) shouldAutoValidate = true;
        }
      }

      if (insp.type === InspectionType.RETOUR && insp.mode === InspectionMode.BOITE_A_CLES) {
        if (insp.delegated && insp.createdBy === InspectionCreator.RENTER) {
          if (now >= deadline24h) shouldAutoValidate = true;
        } else {
          if (now >= deadline24h) shouldAutoValidate = true;
        }
      }

      if (shouldAutoValidate) {
        try {
          await this.prisma.inspection.update({
            where: { id: insp.id },
            data: {
              status: InspectionStatus.VALIDATED,
              validatedAt: now,
            },
          });
          await this.prisma.inspectionTimelineEvent.create({
            data: {
              bookingId: insp.bookingId,
              eventType: 'inspection_auto_validated',
              payload: { inspectionId: insp.id },
            },
          });
          this.logger.log(`Auto-validated inspection ${insp.id}`);
        } catch (e) {
          this.logger.error(`Failed to auto-validate inspection ${insp.id}`, e);
        }
      }
    }
  }

  /** 24h after return validation, if no claim → release deposit */
  async autoReleaseDepositNoClaim() {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const returnInspections = await this.prisma.inspection.findMany({
      where: {
        type: InspectionType.RETOUR,
        status: InspectionStatus.VALIDATED,
        validatedAt: { lte: cutoff },
      },
      include: {
        booking: {
          include: {
            listing: { select: { type: true } },
            deposit: { include: { payment: true } },
            damageClaims: {
              where: {
                status: {
                  notIn: [
                    DamageClaimStatus.ADMIN_REJECTED,
                    DamageClaimStatus.CLOSED,
                  ],
                },
              },
            },
          },
        },
      },
    });

    for (const insp of returnInspections) {
      if (insp.booking.listing.type !== ListingType.CAR_RENTAL) continue;
      if (insp.booking.damageClaims.length > 0) continue;

      const deposit = insp.booking.deposit;
      if (!deposit || deposit.status !== DepositStatus.PREAUTHORIZED) continue;
      if (deposit.payment.status !== PaymentStatus.PENDING) continue;

      try {
        await this.payments.releaseCautionForAdmin(
          insp.bookingId,
          deposit.paymentId,
          'system',
        );
        await this.prisma.inspectionTimelineEvent.create({
          data: {
            bookingId: insp.bookingId,
            eventType: 'deposit_auto_released_no_claim',
            payload: {},
          },
        });
        this.logger.log(`Auto-released deposit for booking ${insp.bookingId} (no claim)`);
      } catch (e) {
        this.logger.error(`Failed to auto-release deposit for ${insp.bookingId}`, e);
      }
    }
  }

  /** RENTER silence 24h after claim submitted → AWAITING_ADMIN_REVIEW */
  async autoAcceptRenterSilence() {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const claims = await this.prisma.damageClaim.findMany({
      where: {
        status: DamageClaimStatus.AWAITING_RENTER_RESPONSE,
        submittedAt: { lte: cutoff },
      },
    });

    for (const claim of claims) {
      try {
        await this.prisma.damageClaim.update({
          where: { id: claim.id },
          data: {
            status: DamageClaimStatus.AWAITING_ADMIN_REVIEW,
            renterResponse: 'accept',
            renterResponseAt: now,
          },
        });
        await this.prisma.inspectionTimelineEvent.create({
          data: {
            bookingId: claim.bookingId,
            eventType: 'damage_claim_renter_silence_accept',
            payload: { damageClaimId: claim.id },
          },
        });
        this.logger.log(`Auto-accepted renter silence for claim ${claim.id}`);
      } catch (e) {
        this.logger.error(`Failed to auto-accept claim ${claim.id}`, e);
      }
    }
  }

  /** 48h after claim in AWAITING_ADMIN_REVIEW with no admin decision → release deposit */
  async autoReleaseDepositAdminTimeout() {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const claims = await this.prisma.damageClaim.findMany({
      where: {
        status: DamageClaimStatus.AWAITING_ADMIN_REVIEW,
        renterResponseAt: { lte: cutoff },
      },
      include: {
        booking: {
          include: {
            listing: { select: { type: true } },
            deposit: { include: { payment: true } },
          },
        },
      },
    });

    for (const claim of claims) {
      if (claim.booking.listing.type !== ListingType.CAR_RENTAL) continue;

      const deposit = claim.booking.deposit;
      if (!deposit || deposit.status !== DepositStatus.PREAUTHORIZED) continue;
      if (deposit.payment.status !== PaymentStatus.PENDING) continue;

      try {
        await this.payments.releaseCautionForAdmin(
          claim.bookingId,
          deposit.paymentId,
          'system',
        );
        await this.prisma.damageClaim.update({
          where: { id: claim.id },
          data: { status: DamageClaimStatus.ADMIN_REJECTED },
        });
        await this.prisma.inspectionTimelineEvent.create({
          data: {
            bookingId: claim.bookingId,
            eventType: 'deposit_auto_released_admin_timeout',
            payload: { damageClaimId: claim.id },
          },
        });
        this.logger.log(`Auto-released deposit for claim ${claim.id} (admin timeout)`);
      } catch (e) {
        this.logger.error(`Failed to auto-release for claim ${claim.id}`, e);
      }
    }
  }
}
