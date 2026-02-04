import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MessagesService } from './messages.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from 'database';

class SendMessageDto {
  receiverId: string;
  body: string;
  bookingId?: string;
}

@Controller('messages')
export class MessagesController {
  constructor(private messages: MessagesService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('thread')
  thread(
    @CurrentUser() user: User,
    @Query('userId') otherUserId: string,
    @Query('bookingId') bookingId?: string,
  ) {
    return this.messages.findThread(user.id, otherUserId, bookingId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('send')
  send(
    @CurrentUser() user: User,
    @Body() dto: SendMessageDto,
  ) {
    return this.messages.sendMessage(user.id, dto.receiverId, dto.body, dto.bookingId);
  }
}
