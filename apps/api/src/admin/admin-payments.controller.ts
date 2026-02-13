import { Body, Controller, Get, Param, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermission, AdminPermission } from './admin-permissions.decorator';
import { AdminPermissionsGuard } from './admin-permissions.guard';
import { AdminAuditInterceptor } from './admin-audit.interceptor';
import { AdminPaymentsService } from './admin-payments.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role, PaymentStatus, PayoutStatus } from 'database';
import type { User } from 'database';

@Controller('admin/payments')
@UseGuards(AuthGuard('jwt'), RolesGuard, AdminPermissionsGuard)
@Roles(Role.ADMIN)
@UseInterceptors(AdminAuditInterceptor)
export class AdminPaymentsController {
  constructor(private adminPayments: AdminPaymentsService) {}

  @Get()
  @RequirePermission(AdminPermission.PAYMENTS_VIEW)
  getPayments(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('bookingId') bookingId?: string,
    @Query('status') status?: PaymentStatus,
    @Query('type') type?: string,
  ) {
    return this.adminPayments.getPayments(
      limit ? parseInt(limit, 10) : undefined,
      offset ? parseInt(offset, 10) : undefined,
      { bookingId, status, type },
    );
  }

  @Get(':id')
  @RequirePermission(AdminPermission.PAYMENTS_VIEW)
  getPaymentById(@Param('id') id: string) {
    return this.adminPayments.getPaymentById(id);
  }

  @Post(':id/refund')
  @RequirePermission(AdminPermission.PAYMENTS_REFUND)
  refundPayment(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: { amount?: number; reason?: string },
  ) {
    return this.adminPayments.refundPayment(id, body.amount, body.reason, user.id);
  }

  @Post(':id/override-amount')
  @RequirePermission(AdminPermission.PAYMENTS_OVERRIDE)
  overridePaymentAmount(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: { amount: number; reason: string },
  ) {
    return this.adminPayments.overridePaymentAmount(id, body.amount, body.reason, user.id);
  }

  @Post(':id/retry')
  @RequirePermission(AdminPermission.PAYMENTS_OVERRIDE)
  retryPayment(@CurrentUser() user: User, @Param('id') id: string) {
    return this.adminPayments.retryPayment(id, user.id);
  }
}
