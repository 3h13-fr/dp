import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OcrSpaceService } from './ocr-space.service';

export const KYC_REVIEW_REASONS = ['DOUBTFUL', 'MISMATCH', 'ILLEGIBLE', 'SUSPECTED_FRAUD'] as const;
export type KycReviewReason = (typeof KYC_REVIEW_REASONS)[number];

function normalizeForMatch(s: string): string {
  return (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsWord(text: string, word: string): boolean {
  if (!word) return true;
  const n = normalizeForMatch(text);
  const w = normalizeForMatch(word);
  if (!w) return true;
  return n.includes(w) || n.split(/\s+/).some((t) => t === w || t.startsWith(w) || t.endsWith(w));
}

@Injectable()
export class KycService {
  constructor(
    private prisma: PrismaService,
    private ocr: OcrSpaceService,
  ) {}

  async getForUser(userId: string): Promise<unknown> {
    const kyc = await this.prisma.kycVerification.findUnique({
      where: { userId },
    });
    return kyc;
  }

  async submit(
    userId: string,
    data: {
      firstName: string;
      lastName: string;
      dateOfBirth?: string | null;
      nationality?: string | null;
      documentType?: string | null;
      idDocUrl: string;
      idDocBackUrl?: string | null;
    },
  ): Promise<unknown> {
    const dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
    const kyc = await this.prisma.kycVerification.upsert({
      where: { userId },
      create: {
        userId,
        status: 'PENDING',
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth,
        nationality: data.nationality ?? undefined,
        documentType: data.documentType ?? undefined,
        idDocUrl: data.idDocUrl,
        idDocBackUrl: data.idDocBackUrl ?? undefined,
      },
      update: {
        status: 'PENDING',
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth,
        nationality: data.nationality ?? undefined,
        documentType: data.documentType ?? undefined,
        idDocUrl: data.idDocUrl,
        idDocBackUrl: data.idDocBackUrl ?? undefined,
        reviewReason: null,
        ocrPayload: undefined,
      },
    });
    await this.runOcrAndChecks(kyc.id);
    return this.prisma.kycVerification.findUnique({
      where: { id: kyc.id },
    });
  }

  async runOcrAndChecks(kycId: string): Promise<void> {
    const kyc = await this.prisma.kycVerification.findUnique({
      where: { id: kycId },
    });
    if (!kyc || kyc.status !== 'PENDING') return;

    let parsedText = '';
    let ocrPayload: unknown = null;

    if (this.ocr.isConfigured() && kyc.idDocUrl) {
      const front = await this.ocr.parseImageUrl(kyc.idDocUrl);
      if (front) {
        parsedText = front.parsedText;
        ocrPayload = front.raw;
      }
      if (kyc.idDocBackUrl) {
        const back = await this.ocr.parseImageUrl(kyc.idDocBackUrl);
        if (back) {
          parsedText = (parsedText + '\n' + back.parsedText).trim();
          ocrPayload = { front: ocrPayload, back: back.raw };
        }
      }
    }

    const hasEnoughText = parsedText.length >= 10;
    const firstNameMatch = containsWord(parsedText, kyc.firstName ?? '');
    const lastNameMatch = containsWord(parsedText, kyc.lastName ?? '');

    if (!this.ocr.isConfigured()) {
      await this.prisma.kycVerification.update({
        where: { id: kycId },
        data: { status: 'PENDING_REVIEW', reviewReason: 'DOUBTFUL', ocrPayload: ocrPayload as object },
      });
      return;
    }

    if (!hasEnoughText) {
      await this.prisma.kycVerification.update({
        where: { id: kycId },
        data: { status: 'PENDING_REVIEW', reviewReason: 'ILLEGIBLE', ocrPayload: ocrPayload as object },
      });
      return;
    }

    if (!firstNameMatch || !lastNameMatch) {
      await this.prisma.kycVerification.update({
        where: { id: kycId },
        data: { status: 'PENDING_REVIEW', reviewReason: 'MISMATCH', ocrPayload: ocrPayload as object },
      });
      return;
    }

    await this.prisma.kycVerification.update({
      where: { id: kycId },
      data: { status: 'APPROVED', verifiedAt: new Date(), ocrPayload: ocrPayload as object },
    });
  }

  async getPendingReview(): Promise<unknown[]> {
    const list = await this.prisma.kycVerification.findMany({
      where: { status: 'PENDING_REVIEW' },
      include: {
        user: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return list;
  }

  async getDetailForAdmin(userId: string): Promise<unknown> {
    const kyc = await this.prisma.kycVerification.findFirst({
      where: { userId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
    if (!kyc) throw new NotFoundException('KYC not found');
    return kyc;
  }

  async updateStatusByAdmin(
    userId: string,
    status: 'APPROVED' | 'REJECTED',
    adminUserId: string,
    rejectionReason?: string | null,
  ): Promise<unknown> {
    const kyc = await this.prisma.kycVerification.findUnique({
      where: { userId },
    });
    if (!kyc) throw new NotFoundException('KYC not found');
    if (kyc.status !== 'PENDING_REVIEW') {
      throw new Error('Only PENDING_REVIEW can be updated by admin');
    }
    return this.prisma.kycVerification.update({
      where: { userId },
      data: {
        status,
        verifiedAt: status === 'APPROVED' ? new Date() : undefined,
        reviewedBy: adminUserId,
        rejectionReason: status === 'REJECTED' ? (rejectionReason ?? undefined) : undefined,
      },
    });
  }

  async hasApprovedKyc(userId: string): Promise<boolean> {
    const kyc = await this.prisma.kycVerification.findUnique({
      where: { userId },
      select: { status: true },
    });
    return kyc?.status === 'APPROVED';
  }
}
