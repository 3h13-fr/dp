import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from 'database';

@Controller('notifications')
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  my(
    @CurrentUser() user: User,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ): Promise<unknown[]> {
    return this.notifications.findForUser(
      user.id,
      limit ? parseInt(limit, 10) : undefined,
      unreadOnly === 'true',
    );
  }
}
