import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UploadService, UploadPurpose } from './upload.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from 'database';

class PresignDto {
  purpose: UploadPurpose;
  contentType: string;
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
}
