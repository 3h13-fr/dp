import { Body, Controller, Param, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermission, AdminPermission } from './admin-permissions.decorator';
import { AdminPermissionsGuard } from './admin-permissions.guard';
import { AdminAuditInterceptor } from './admin-audit.interceptor';
import { BookingsService } from '../bookings/bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role, BookingStatus } from 'database';
import type { User } from 'database';

@Controller('admin/bookings')
@UseGuards(AuthGuard('jwt'), RolesGuard, AdminPermissionsGuard)
@Roles(Role.ADMIN)
@UseInterceptors(AdminAuditInterceptor)
export class AdminBookingsController {
  constructor(
    private bookings: BookingsService,
    private prisma: PrismaService,
  ) {}

  @Post(':id/force-approve')
  @RequirePermission(AdminPermission.BOOKINGS_APPROVE_FORCE)
  async forceApprove(@CurrentUser() user: User, @Param('id') bookingId: string) {
    // Get booking to find hostId
    const booking = await this.bookings.findOne(bookingId);
    if (!booking) throw new Error('Booking not found');

    // Use the approve method (it will validate)
    return this.bookings.approve(bookingId, (booking as any).hostId);
  }

  @Post(':id/force-reject')
  @RequirePermission(AdminPermission.BOOKINGS_APPROVE_FORCE)
  async forceReject(
    @CurrentUser() user: User,
    @Param('id') bookingId: string,
    @Body() body: { reason?: string },
  ) {
    // Get booking to find hostId
    const booking = await this.bookings.findOne(bookingId);
    if (!booking) throw new Error('Booking not found');

    // Use the reject method (it will validate)
    return this.bookings.reject(bookingId, (booking as any).hostId, body.reason);
  }

  @Post(':id/override-status')
  @RequirePermission(AdminPermission.BOOKINGS_OVERRIDE)
  async overrideStatus(
    @CurrentUser() user: User,
    @Param('id') bookingId: string,
    @Body() body: { status: BookingStatus; reason?: string },
  ) {
    // Get booking to find guestId or hostId
    const booking = await this.bookings.findOne(bookingId);
    if (!booking) throw new Error('Booking not found');

    // Use updateStatus with admin user ID
    return this.bookings.updateStatus(bookingId, body.status, user.id);
  }

  @Post(':id/extend-deadline')
  @RequirePermission(AdminPermission.BOOKINGS_OVERRIDE)
  async extendDeadline(
    @CurrentUser() user: User,
    @Param('id') bookingId: string,
    @Body() body: { hours: number },
  ) {
    // Get booking
    const booking = await this.bookings.findOne(bookingId);
    if (!booking) throw new Error('Booking not found');

    const currentDeadline = (booking as any).approvalDeadline;
    if (!currentDeadline) {
      throw new Error('Booking does not have an approval deadline');
    }

    const newDeadline = new Date(currentDeadline);
    newDeadline.setHours(newDeadline.getHours() + body.hours);

    // Update deadline
    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { approvalDeadline: newDeadline },
    });

    return updated;
  }
}
