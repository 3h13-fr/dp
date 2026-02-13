import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DamageClaimService } from './damage-claim.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from 'database';
import { CreateDamageClaimDto } from './dto/create-damage-claim.dto';
import { UpdateDamageClaimDto } from './dto/update-damage-claim.dto';
import { RenterRespondDto } from './dto/renter-respond.dto';

@Controller('damage-claims')
export class DamageClaimController {
  constructor(private damageClaim: DamageClaimService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateDamageClaimDto) {
    return this.damageClaim.create(user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.damageClaim.findOne(id, user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateDamageClaimDto,
  ) {
    return this.damageClaim.update(id, user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/submit')
  submit(@Param('id') id: string, @CurrentUser() user: User) {
    return this.damageClaim.submit(id, user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/renter-respond')
  renterRespond(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: RenterRespondDto,
  ) {
    return this.damageClaim.renterRespond(id, user.id, dto.response, dto.note);
  }
}
