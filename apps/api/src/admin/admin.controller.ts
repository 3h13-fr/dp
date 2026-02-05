import { Body, Controller, Get, Patch, Param, Query, Req, UseGuards } from '@nestjs/common';
import { IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { KycService } from '../kyc/kyc.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from 'database';
import type { User } from 'database';
import type { Request } from 'express';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private admin: AdminService,
    private kyc: KycService,
  ) {}

  @Get('users')
  getUsers(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('role') role?: Role,
  ): Promise<{ items: unknown[]; total: number }> {
    return this.admin.getUsers(
      limit ? parseInt(limit, 10) : undefined,
      offset ? parseInt(offset, 10) : undefined,
      role,
    );
  }

  @Get('listings')
  getListings(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('status') status?: string,
  ): Promise<{ items: unknown[]; total: number }> {
    return this.admin.getListingsForModeration(
      limit ? parseInt(limit, 10) : undefined,
      offset ? parseInt(offset, 10) : undefined,
      status,
    );
  }

  @Get('listings/:id')
  getListingById(@Param('id') id: string): Promise<unknown> {
    return this.admin.getListingById(id);
  }

  @Patch('listings/:id/status')
  updateListingStatus(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: { status: string },
    @Req() req: Request,
  ): Promise<unknown> {
    const ip = req.ip ?? req.socket?.remoteAddress ?? undefined;
    return this.admin.updateListingStatus(id, body.status, user.id, ip);
  }

  @Get('bookings')
  getBookings(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('status') status?: string,
  ): Promise<{ items: unknown[]; total: number }> {
    return this.admin.getBookings(
      limit ? parseInt(limit, 10) : undefined,
      offset ? parseInt(offset, 10) : undefined,
      status,
    );
  }

  @Get('audit-logs')
  getAuditLogs(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('resource') resource?: string,
  ): Promise<{ items: unknown[]; total: number }> {
    return this.admin.getAuditLogs(
      limit ? parseInt(limit, 10) : undefined,
      offset ? parseInt(offset, 10) : undefined,
      resource,
    );
  }

  @Get('settings')
  getSettings(): Promise<{ items: { key: string; label: string; category: string; valueMasked: string; hasValue: boolean }[] }> {
    return this.admin.getSettings();
  }

  @Patch('settings')
  updateSettings(@Body() body: { updates: { key: string; value: string }[] }): Promise<{ updated: number }> {
    const updates = Array.isArray(body?.updates) ? body.updates : [];
    return this.admin.updateSettings(updates);
  }

  @Get('kyc-review')
  getKycPendingReview(): Promise<unknown[]> {
    return this.kyc.getPendingReview();
  }

  @Get('kyc/:userId')
  getKycDetail(@Param('userId') userId: string): Promise<unknown> {
    return this.kyc.getDetailForAdmin(userId);
  }

  @Patch('kyc/:userId/status')
  updateKycStatus(
    @CurrentUser() user: User,
    @Param('userId') userId: string,
    @Body() body: { status: 'APPROVED' | 'REJECTED'; rejectionReason?: string },
  ): Promise<unknown> {
    return this.kyc.updateStatusByAdmin(
      userId,
      body.status,
      user.id,
      body.rejectionReason ?? undefined,
    );
  }
}
