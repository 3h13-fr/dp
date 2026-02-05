import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { AuthService } from './auth.service';
import { KycService } from '../kyc/kyc.service';
import { CurrentUser } from './decorators/current-user.decorator';
import type { User } from 'database';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  password: string;
}

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;
}

export class SendCodeDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  locale?: string;
}

export class VerifyCodeDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @MinLength(6)
  @MaxLength(6)
  code: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private kyc: KycService,
  ) {}

  @Post('send-code')
  async sendCode(@Body() dto: SendCodeDto) {
    return this.auth.sendCode({
      email: dto.email,
      phone: dto.phone,
      locale: dto.locale,
    });
  }

  @Post('verify-code')
  async verifyCode(@Body() dto: VerifyCodeDto) {
    return this.auth.verifyCode({
      email: dto.email,
      phone: dto.phone,
      code: dto.code,
    });
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.auth.register({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async me(@CurrentUser() user: User) {
    let kycStatus: string | null = null;
    try {
      const kyc = await this.kyc.getForUser(user.id);
      const kycRecord = kyc as { status?: string } | null;
      kycStatus = kycRecord?.status ?? null;
    } catch {
      // KYC fetch must not break /auth/me (e.g. missing table or migration)
    }
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      preferredLang: user.preferredLang,
      createdAt: user.createdAt,
      kycStatus,
    };
  }
}
