import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { IsIn, IsString } from 'class-validator';
import { AuthGuard } from '@nestjs/passport';
import { UploadService, UploadPurpose } from './upload.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from 'database';

class PresignDto {
  @IsIn(['listing_photo', 'kyc_id', 'kyc_license', 'incident', 'message_attachment', 'category_image', 'inspection_photo'])
  purpose: UploadPurpose;

  @IsString()
  contentType: string;

  @IsString()
  filename: string;
}

@Controller('uploads')
export class UploadController {
  constructor(private upload: UploadService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('presign')
  async presign(
    @CurrentUser() user: User,
    @Body() dto: PresignDto,
  ) {
    if (!this.upload.isConfigured()) {
      return { uploadUrl: null, publicUrl: null, key: null };
    }
    const key = this.upload.buildKey(dto.purpose, user.id, dto.filename ?? 'file');
    const result = await this.upload.getPresignedUploadUrl(key, dto.contentType ?? 'application/octet-stream');
    return result ? { ...result, key } : { uploadUrl: null, publicUrl: null, key: null };
  }

  /** Get presigned URL for reading an image (public endpoint, no auth required) */
  @Get('presigned-read')
  async getPresignedReadUrl(
    @Query('url') url: string,
    @Query('expiresIn') expiresIn?: string,
  ) {
    if (!this.upload.isConfigured() || !url) {
      return { signedUrl: null };
    }
    const expiresInSeconds = expiresIn ? parseInt(expiresIn, 10) : 3600;
    const signedUrl = await this.upload.getPresignedReadUrl(url, expiresInSeconds);
    return { signedUrl };
  }
}
