import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  IsObject,
  IsUrl,
} from 'class-validator';

export class UpdateDamageClaimDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsObject()
  zoneCoords?: Record<string, unknown>;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amountRequested?: number;

  @IsOptional()
  @IsString()
  justification?: string;

  @IsOptional()
  @IsUrl()
  quoteUrl?: string;

  @IsOptional()
  @IsString()
  departPhotoUrl?: string;

  @IsOptional()
  @IsString()
  returnPhotoUrl?: string;
}
