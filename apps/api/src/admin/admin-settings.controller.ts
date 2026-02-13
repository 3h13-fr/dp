import { Body, Controller, Get, Param, Patch, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermission, AdminPermission } from './admin-permissions.decorator';
import { AdminPermissionsGuard } from './admin-permissions.guard';
import { AdminAuditInterceptor } from './admin-audit.interceptor';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from 'database';
import type { User } from 'database';

@Controller('admin/payment-settings')
@UseGuards(AuthGuard('jwt'), RolesGuard, AdminPermissionsGuard)
@Roles(Role.ADMIN)
@UseInterceptors(AdminAuditInterceptor)
export class AdminPaymentSettingsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @RequirePermission(AdminPermission.SETTINGS_VIEW)
  async getSettings() {
    const settings = await this.prisma.paymentSettings.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    return { items: settings };
  }

  @Get(':key')
  @RequirePermission(AdminPermission.SETTINGS_VIEW)
  async getSetting(@Param('key') key: string) {
    const setting = await this.prisma.paymentSettings.findUnique({
      where: { key },
    });
    return setting;
  }

  @Patch(':key')
  @RequirePermission(AdminPermission.SETTINGS_MODIFY)
  async updateSetting(
    @CurrentUser() user: User,
    @Param('key') key: string,
    @Body() body: { value: any; description?: string },
  ) {
    const setting = await this.prisma.paymentSettings.upsert({
      where: { key },
      create: {
        key,
        value: body.value,
        description: body.description,
        updatedBy: user.id,
      },
      update: {
        value: body.value,
        description: body.description,
        updatedBy: user.id,
      },
    });
    return setting;
  }
}
