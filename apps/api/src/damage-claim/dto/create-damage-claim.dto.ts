import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  IsObject,
  IsUrl,
} from 'class-validator';

export class CreateDamageClaimDto {
  @IsString()
  bookingId: string;

  @IsString()
  category: string;

  @IsOptional()
  @IsObject()
  zoneCoords?: Record<string, unknown>;

  @IsNumber()
  @Min(0)
  amountRequested: number;

  @IsString()
  justification: string;

  @IsOptional()
  @IsUrl()
  quoteUrl?: string;

  @IsString()
  departPhotoUrl: string;

  @IsString()
  returnPhotoUrl: string;
}
