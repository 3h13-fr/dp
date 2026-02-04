import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export type UploadPurpose = 'listing_photo' | 'kyc_id' | 'kyc_license' | 'incident';

@Injectable()
export class UploadService {
  private readonly s3: S3Client | null = null;
  private readonly bucket: string = '';
  private readonly region: string = 'eu-west-1';
  private readonly publicBaseUrl: string = '';

  constructor(private config: ConfigService) {
    const accessKey = this.config.get<string>('AWS_ACCESS_KEY_ID');
    const secretKey = this.config.get<string>('AWS_SECRET_ACCESS_KEY');
    this.bucket = this.config.get<string>('AWS_S3_BUCKET', '');
    this.region = this.config.get<string>('AWS_REGION', 'eu-west-1');
    const endpoint = this.config.get<string>('AWS_S3_ENDPOINT');
    if (accessKey && secretKey && this.bucket) {
      this.s3 = new S3Client({
        region: this.region,
        ...(endpoint && { endpoint, forcePathStyle: true }),
        credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
      });
    }
    this.publicBaseUrl = this.config.get<string>('AWS_S3_PUBLIC_URL') ?? `https://${this.bucket}.s3.${this.region}.amazonaws.com`;
  }

  isConfigured(): boolean {
    return this.s3 !== null && this.bucket.length > 0;
  }

  /** Generate a safe key for the given purpose and user/entity */
  buildKey(purpose: UploadPurpose, userId: string, suffix: string): string {
    const sanitized = suffix.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 64);
    const prefix = purpose === 'listing_photo' ? 'listings' : purpose === 'incident' ? 'incidents' : 'kyc';
    return `${prefix}/${userId}/${Date.now()}-${sanitized}`;
  }

  /** Get presigned URL for PUT upload (client uploads directly to S3) */
  async getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds = 3600,
  ): Promise<{ uploadUrl: string; publicUrl: string } | null> {
    if (!this.s3) return null;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: expiresInSeconds });
    const publicUrl = `${this.publicBaseUrl}/${key}`;
    return { uploadUrl, publicUrl };
  }

  /** Return public URL for a stored key (if bucket is public) or presigned get for private */
  getPublicUrl(key: string): string {
    return `${this.publicBaseUrl}/${key}`;
  }
}
