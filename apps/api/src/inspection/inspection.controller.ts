import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { InspectionService } from './inspection.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from 'database';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';

@Controller('inspections')
export class InspectionController {
  constructor(private inspection: InspectionService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(
    @CurrentUser() user: User,
    @Body() dto: CreateInspectionDto,
    @Req() req: Request,
  ) {
    const ip = req.ip ?? req.socket?.remoteAddress;
    return this.inspection.create(user.id, dto, { ip });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('booking/:bookingId')
  findForBooking(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: User,
  ) {
    return this.inspection.findForBooking(bookingId, user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.inspection.findOne(id, user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateInspectionDto,
  ) {
    return this.inspection.update(id, user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/submit')
  submit(@Param('id') id: string, @CurrentUser() user: User) {
    return this.inspection.submit(id, user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/validate')
  validate(@Param('id') id: string, @CurrentUser() user: User) {
    return this.inspection.validate(id, user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/contest')
  contest(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() body: { note?: string },
  ) {
    return this.inspection.contest(id, user.id, body.note);
  }
}
