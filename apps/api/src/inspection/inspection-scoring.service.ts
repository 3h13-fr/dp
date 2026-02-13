import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CAR_INSPECTION_ITEM_CODES } from './inspection.constants';

@Injectable()
export class InspectionScoringService {
  constructor(private prisma: PrismaService) {}

  /** Compute inspection quality score (0-100) */
  computeInspectionQuality(inspection: {
    items: Array<{ itemCode: string; photoUrl: string | null; conditionStatus: string; cleanlinessLevel: string }>;
    mileageValue: number | null;
    energyLevelPercent: number | null;
    documentsPresent: unknown;
    accessoriesChecklist: unknown;
    metadata: unknown;
    createdAt: Date;
    type: string;
  }, bookingStartAt?: Date): number {
    let score = 0;
    const maxScore = 100;

    const completeness = inspection.items.length >= CAR_INSPECTION_ITEM_CODES.length ? 30 : (inspection.items.length / CAR_INSPECTION_ITEM_CODES.length) * 30;
    score += completeness;

    const hasRequiredFields =
      inspection.mileageValue != null &&
      inspection.energyLevelPercent != null &&
      inspection.documentsPresent != null &&
      inspection.accessoriesChecklist != null;
    score += hasRequiredFields ? 25 : 0;

    const hasPhotos = inspection.items.every((i) => i.photoUrl?.trim());
    score += hasPhotos ? 25 : inspection.items.filter((i) => i.photoUrl?.trim()).length / inspection.items.length * 25;

    if (bookingStartAt) {
      const createdBeforeStart = inspection.createdAt <= bookingStartAt;
      score += createdBeforeStart ? 10 : 5;
    } else {
      score += 10;
    }

    const hasGeo = inspection.metadata && typeof inspection.metadata === 'object' && 'latitude' in (inspection.metadata as object);
    score += hasGeo ? 10 : 0;

    return Math.min(maxScore, Math.round(score));
  }

  /** Compute user reliability score (0-100) - simplified */
  async computeUserReliability(userId: string, role: 'host' | 'renter'): Promise<number> {
    const claimsAsCreator = await this.prisma.damageClaim.count({
      where: { createdBy: userId },
    });
    const claimsAsRenter = await this.prisma.damageClaim.count({
      where: { booking: { guestId: userId } },
    });
    const contestedClaims = await this.prisma.damageClaim.count({
      where: {
        renterResponse: 'contest',
        booking: { guestId: userId },
      },
    });

    let score = 80;
    if (role === 'host') {
      score -= claimsAsCreator * 5;
    } else {
      score -= contestedClaims * 3;
    }
    return Math.max(0, Math.min(100, score));
  }

  /** Compute claim confidence score (0-100) */
  computeClaimConfidence(claim: {
    departPhotoUrl: string;
    returnPhotoUrl: string;
    quoteUrl: string | null;
    amountRequested: { toNumber: () => number };
    justification: string;
  }): number {
    let score = 50;

    if (claim.departPhotoUrl?.trim() && claim.returnPhotoUrl?.trim()) score += 25;
    if (claim.quoteUrl?.trim()) score += 15;
    if (claim.justification?.trim().length > 50) score += 10;

    return Math.min(100, score);
  }

  /** Store scores for inspection */
  async storeInspectionScores(
    bookingId: string,
    inspectionId: string,
    inspection: Parameters<typeof this.computeInspectionQuality>[0],
    hostId: string,
    guestId: string,
    bookingStartAt?: Date,
  ) {
    const qualityScore = this.computeInspectionQuality(inspection, bookingStartAt);
    const [hostScore, renterScore] = await Promise.all([
      this.computeUserReliability(hostId, 'host'),
      this.computeUserReliability(guestId, 'renter'),
    ]);

    await this.prisma.inspectionScoring.create({
      data: {
        bookingId,
        inspectionId,
        inspectionQualityScore: qualityScore,
        hostReliabilityScore: hostScore,
        renterReliabilityScore: renterScore,
      },
    });
  }

  /** Store scores for damage claim */
  async storeClaimScores(
    bookingId: string,
    damageClaimId: string,
    claim: Parameters<typeof this.computeClaimConfidence>[0],
  ) {
    const confidenceScore = this.computeClaimConfidence(claim);

    await this.prisma.inspectionScoring.create({
      data: {
        bookingId,
        damageClaimId,
        claimConfidenceScore: confidenceScore,
      },
    });
  }
}
