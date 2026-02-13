import { Body, Controller, Get, Post, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsEmail, IsString, MinLength, MaxLength, IsOptional, ValidateNested } from 'class-validator';
import { Type, Transform } from 'class-transformer';
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

export class ForgotPasswordDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  locale?: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(1)
  token: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  newPassword: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(1, { message: 'Current password is required' })
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  newPassword: string;
}

class ProfileDataDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsString()
  preferredName?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsString()
  hostDisplayName?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsString()
  residentialAddress?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsString()
  postalAddress?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsString()
  emergencyContacts?: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsString()
  firstName?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsString()
  lastName?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsString()
  phone?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProfileDataDto)
  profileData?: ProfileDataDto;
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

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword({
      email: dto.email,
      locale: dto.locale,
    });
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword({
      token: dto.token,
      newPassword: dto.newPassword,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('change-password')
  async changePassword(@CurrentUser() user: User, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword({
      userId: user.id,
      currentPassword: dto.currentPassword,
      newPassword: dto.newPassword,
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
      profileData: user.profileData,
      createdAt: user.createdAt,
      kycStatus,
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('me')
  async updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    try {
      return await this.auth.updateProfile(user.id, dto);
    } catch (error) {
      console.error('[AuthController] Error updating profile:', error);
      console.error('[AuthController] DTO received:', JSON.stringify(dto, null, 2));
      if (error instanceof Error) {
        console.error('[AuthController] Error message:', error.message);
        console.error('[AuthController] Error stack:', error.stack);
      }
      throw error;
    }
  }
}
