import { Body, Controller, Get, Param, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermission, AdminPermission } from './admin-permissions.decorator';
import { AdminPermissionsGuard } from './admin-permissions.guard';
import { AdminAuditInterceptor } from './admin-audit.interceptor';
import { AdminPaymentsService } from './admin-payments.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role, PayoutStatus } from 'database';
import type { User } from 'database';

@Controller('admin/payouts')
@UseGuards(AuthGuard('jwt'), RolesGuard, AdminPermissionsGuard)
@Roles(Role.ADMIN)
@UseInterceptors(AdminAuditInterceptor)
export class AdminPayoutsController {
  constructor(private adminPayments: AdminPaymentsService) {}

  @Get()
  @RequirePermission(AdminPermission.PAYOUTS_VIEW)
  getPayouts(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('hostId') hostId?: string,
    @Query('status') status?: PayoutStatus,
    @Query('bookingId') bookingId?: string,
  ) {
    return this.adminPayments.getPayouts(
      limit ? parseInt(limit, 10) : undefined,
      offset ? parseInt(offset, 10) : undefined,
      { hostId, status, bookingId },
    );
  }

  @Get(':id')
  @RequirePermission(AdminPermission.PAYOUTS_VIEW)
  getPayoutById(@Param('id') id: string) {
    return this.adminPayments.getPayoutById(id);
  }

  @Post(':id/force-process')
  @RequirePermission(AdminPermission.PAYOUTS_PROCESS)
  forceProcessPayout(@CurrentUser() user: User, @Param('id') id: string) {
    return this.adminPayments.forceProcessPayout(id, user.id);
  }

  @Post(':id/reverse')
  @RequirePermission(AdminPermission.PAYOUTS_REVERSE)
  reversePayout(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.adminPayments.reversePayout(id, body.reason, user.id);
  }
}
