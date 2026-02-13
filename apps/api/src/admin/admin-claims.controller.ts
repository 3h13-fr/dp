import { Body, Controller, Get, Param, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermission, AdminPermission } from './admin-permissions.decorator';
import { AdminPermissionsGuard } from './admin-permissions.guard';
import { AdminAuditInterceptor } from './admin-audit.interceptor';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role, DamageClaimStatus } from 'database';
import type { User } from 'database';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { Decimal } from 'database';

@Controller('admin/claims')
@UseGuards(AuthGuard('jwt'), RolesGuard, AdminPermissionsGuard)
@Roles(Role.ADMIN)
@UseInterceptors(AdminAuditInterceptor)
export class AdminClaimsController {
  constructor(
    private prisma: PrismaService,
    private payments: PaymentsService,
  ) {}

  @Get()
  @RequirePermission(AdminPermission.CLAIMS_VIEW)
  async getClaims(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('bookingId') bookingId?: string,
    @Query('status') status?: DamageClaimStatus,
  ) {
    const where: Record<string, unknown> = {};
    if (bookingId) where.bookingId = bookingId;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.damageClaim.findMany({
        where,
        include: {
          booking: {
            include: {
              listing: { select: { id: true, title: true, displayName: true } },
              guest: { select: { id: true, email: true, firstName: true, lastName: true } },
              host: { select: { id: true, email: true, firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit ? parseInt(limit, 10) : 50,
        skip: offset ? parseInt(offset, 10) : 0,
      }),
      this.prisma.damageClaim.count({ where }),
    ]);

    return { items, total };
  }

  @Get(':id')
  @RequirePermission(AdminPermission.CLAIMS_VIEW)
  async getClaimById(@Param('id') id: string) {
    const claim = await this.prisma.damageClaim.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            listing: true,
            guest: true,
            host: true,
            inspections: { include: { items: true } },
            deposit: { include: { payment: true } },
          },
        },
      },
    });

    if (!claim) throw new Error('Damage claim not found');
    return claim;
  }

  @Post(':id/approve')
  @RequirePermission(AdminPermission.CLAIMS_DECIDE)
  async approve(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: { note?: string },
  ) {
    const claim = await this.prisma.damageClaim.findUnique({
      where: { id },
      include: { booking: { include: { deposit: { include: { payment: true } } } } },
    });

    if (!claim) throw new Error('Damage claim not found');
    if (claim.status !== DamageClaimStatus.AWAITING_ADMIN_REVIEW) {
      throw new Error('Claim is not awaiting admin review');
    }

    const deposit = claim.booking.deposit;
    if (!deposit) throw new Error('No deposit found for this booking');

    const amountToCapture = claim.amountRequested.toNumber();
    await this.payments.captureCautionForAdmin(
      claim.bookingId,
      deposit.paymentId,
      user.id,
      amountToCapture,
    );

    await this.prisma.damageClaim.update({
      where: { id },
      data: {
        status: DamageClaimStatus.ADMIN_APPROVED,
        adminDecision: 'approved',
        adminAmount: claim.amountRequested,
        adminNote: body.note ?? null,
        adminDecidedAt: new Date(),
        adminId: user.id,
      },
    });

    await this.prisma.inspectionTimelineEvent.create({
      data: {
        bookingId: claim.bookingId,
        eventType: 'damage_claim_admin_approved',
        payload: { damageClaimId: id, adminId: user.id },
      },
    });

    return { success: true };
  }

  @Post(':id/adjust')
  @RequirePermission(AdminPermission.CLAIMS_DECIDE)
  async adjust(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: { amount: number; note?: string },
  ) {
    const claim = await this.prisma.damageClaim.findUnique({
      where: { id },
      include: { booking: { include: { deposit: { include: { payment: true } } } } },
    });

    if (!claim) throw new Error('Damage claim not found');
    if (claim.status !== DamageClaimStatus.AWAITING_ADMIN_REVIEW) {
      throw new Error('Claim is not awaiting admin review');
    }

    const deposit = claim.booking.deposit;
    if (!deposit) throw new Error('No deposit found for this booking');

    const maxAmount = deposit.payment.amount.toNumber();
    const amountToCapture = Math.min(body.amount, maxAmount);
    if (amountToCapture <= 0) throw new Error('Amount must be positive');

    await this.payments.captureCautionForAdmin(
      claim.bookingId,
      deposit.paymentId,
      user.id,
      amountToCapture,
    );

    await this.prisma.damageClaim.update({
      where: { id },
      data: {
        status: DamageClaimStatus.ADMIN_ADJUSTED,
        adminDecision: 'adjusted',
        adminAmount: new Decimal(amountToCapture),
        adminNote: body.note ?? null,
        adminDecidedAt: new Date(),
        adminId: user.id,
      },
    });

    await this.prisma.inspectionTimelineEvent.create({
      data: {
        bookingId: claim.bookingId,
        eventType: 'damage_claim_admin_adjusted',
        payload: { damageClaimId: id, adminId: user.id, amount: amountToCapture },
      },
    });

    return { success: true };
  }

  @Post(':id/reject')
  @RequirePermission(AdminPermission.CLAIMS_DECIDE)
  async reject(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: { note?: string },
  ) {
    const claim = await this.prisma.damageClaim.findUnique({
      where: { id },
      include: { booking: { include: { deposit: { include: { payment: true } } } } },
    });

    if (!claim) throw new Error('Damage claim not found');
    if (claim.status !== DamageClaimStatus.AWAITING_ADMIN_REVIEW) {
      throw new Error('Claim is not awaiting admin review');
    }

    const deposit = claim.booking.deposit;
    if (deposit) {
      await this.payments.releaseCautionForAdmin(
        claim.bookingId,
        deposit.paymentId,
        user.id,
      );
    }

    await this.prisma.damageClaim.update({
      where: { id },
      data: {
        status: DamageClaimStatus.ADMIN_REJECTED,
        adminDecision: 'rejected',
        adminNote: body.note ?? null,
        adminDecidedAt: new Date(),
        adminId: user.id,
      },
    });

    await this.prisma.inspectionTimelineEvent.create({
      data: {
        bookingId: claim.bookingId,
        eventType: 'damage_claim_admin_rejected',
        payload: { damageClaimId: id, adminId: user.id },
      },
    });

    return { success: true };
  }
}
