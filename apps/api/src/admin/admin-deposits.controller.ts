import { Body, Controller, Get, Param, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermission, AdminPermission } from './admin-permissions.decorator';
import { AdminPermissionsGuard } from './admin-permissions.guard';
import { AdminAuditInterceptor } from './admin-audit.interceptor';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from 'database';
import type { User } from 'database';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';

@Controller('admin/deposits')
@UseGuards(AuthGuard('jwt'), RolesGuard, AdminPermissionsGuard)
@Roles(Role.ADMIN)
@UseInterceptors(AdminAuditInterceptor)
export class AdminDepositsController {
  constructor(
    private prisma: PrismaService,
    private payments: PaymentsService,
  ) {}

  @Get()
  @RequirePermission(AdminPermission.DEPOSITS_VIEW)
  async getDeposits(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('bookingId') bookingId?: string,
    @Query('status') status?: string,
  ) {
    const where: Record<string, unknown> = {};
    if (bookingId) where.bookingId = bookingId;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.deposit.findMany({
        where,
        include: {
          booking: {
            include: {
              listing: { select: { id: true, title: true, displayName: true } },
              guest: { select: { id: true, email: true, firstName: true, lastName: true } },
              host: { select: { id: true, email: true, firstName: true, lastName: true } },
            },
          },
          payment: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit ? parseInt(limit, 10) : 50,
        skip: offset ? parseInt(offset, 10) : 0,
      }),
      this.prisma.deposit.count({ where }),
    ]);

    return { items, total };
  }

  @Get(':id')
  @RequirePermission(AdminPermission.DEPOSITS_VIEW)
  async getDepositById(@Param('id') id: string) {
    const deposit = await this.prisma.deposit.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            listing: true,
            guest: true,
            host: true,
            inspections: { include: { items: true } },
            damageClaims: true,
          },
        },
        payment: true,
      },
    });

    if (!deposit) throw new Error('Deposit not found');
    return deposit;
  }

  @Post(':id/capture')
  @RequirePermission(AdminPermission.DEPOSITS_CAPTURE)
  async capture(
    @CurrentUser() user: User,
    @Param('id') depositId: string,
    @Body() body: { amount?: number },
  ) {
    const deposit = await this.prisma.deposit.findUnique({
      where: { id: depositId },
      include: { payment: true },
    });

    if (!deposit) throw new Error('Deposit not found');

    return this.payments.captureCautionForAdmin(
      deposit.bookingId,
      deposit.paymentId,
      user.id,
      body.amount,
    );
  }

  @Post(':id/release')
  @RequirePermission(AdminPermission.DEPOSITS_RELEASE)
  async release(
    @CurrentUser() user: User,
    @Param('id') depositId: string,
  ) {
    const deposit = await this.prisma.deposit.findUnique({
      where: { id: depositId },
      include: { payment: true },
    });

    if (!deposit) throw new Error('Deposit not found');

    return this.payments.releaseCautionForAdmin(
      deposit.bookingId,
      deposit.paymentId,
      user.id,
    );
  }
}
