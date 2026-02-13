import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export type UploadPurpose = 'listing_photo' | 'kyc_id' | 'kyc_license' | 'incident' | 'message_attachment' | 'category_image' | 'inspection_photo';

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
    const prefix =
      purpose === 'listing_photo'
        ? 'listings'
        : purpose === 'incident'
          ? 'incidents'
          : purpose === 'message_attachment'
            ? 'messages'
            : purpose === 'category_image'
              ? 'categories'
              : purpose === 'inspection_photo'
                ? 'inspections'
                : 'kyc';
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

  /** Extract S3 key from a public URL */
  extractKeyFromUrl(url: string): string | null {
    try {
      // Try to extract key from publicBaseUrl format
      if (url.startsWith(this.publicBaseUrl)) {
        return url.replace(this.publicBaseUrl, '').replace(/^\//, '');
      }
      // Try to extract from standard S3 URL format: https://bucket.s3.region.amazonaws.com/key
      const s3UrlPattern = new RegExp(`https://${this.bucket}\\.s3[.-]${this.region.replace(/-/g, '\\-')}\\.amazonaws\\.com/(.+)$`);
      const match = url.match(s3UrlPattern);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
      // Try to extract from custom endpoint format: https://endpoint/bucket/key
      if (this.config.get<string>('AWS_S3_ENDPOINT')) {
        const endpointPattern = new RegExp(`https://[^/]+/${this.bucket}/(.+)$`);
        const endpointMatch = url.match(endpointPattern);
        if (endpointMatch && endpointMatch[1]) {
          return decodeURIComponent(endpointMatch[1]);
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /** Get presigned URL for GET (reading) an object from S3 */
  async getPresignedReadUrl(
    keyOrUrl: string,
    expiresInSeconds = 3600,
  ): Promise<string | null> {
    if (!this.s3) return null;
    
    // If it's already a key, use it directly; otherwise extract from URL
    const key = keyOrUrl.includes('/') && keyOrUrl.startsWith('http') 
      ? this.extractKeyFromUrl(keyOrUrl)
      : keyOrUrl;
    
    if (!key) return null;

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    
    try {
      const signedUrl = await getSignedUrl(this.s3, command, { expiresIn: expiresInSeconds });
      return signedUrl;
    } catch (error) {
      console.error('Error generating presigned read URL:', error);
      return null;
    }
  }
}
