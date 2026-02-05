import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';
import { KycService } from './kyc.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from 'database';

class SubmitKycDto {
  @IsString()
  @MinLength(1)
  firstName: string;

  @IsString()
  @MinLength(1)
  lastName: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string | null;

  @IsOptional()
  @IsString()
  nationality?: string | null;

  @IsOptional()
  @IsString()
  documentType?: string | null;

  @IsUrl()
  idDocUrl: string;

  @IsOptional()
  @IsString()
  idDocBackUrl?: string | null;
}

@Controller('kyc')
@UseGuards(AuthGuard('jwt'))
export class KycController {
  constructor(private kyc: KycService) {}

  @Get()
  getMy(@CurrentUser() user: User) {
    return this.kyc.getForUser(user.id);
  }

  @Post()
  submit(@CurrentUser() user: User, @Body() dto: SubmitKycDto) {
    return this.kyc.submit(user.id, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      dateOfBirth: dto.dateOfBirth ?? undefined,
      nationality: dto.nationality ?? undefined,
      documentType: dto.documentType ?? undefined,
      idDocUrl: dto.idDocUrl,
      idDocBackUrl: dto.idDocBackUrl ?? undefined,
    });
  }
}
