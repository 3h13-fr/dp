import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsObject,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InspectionType, InspectionMode, InspectionCreator, ConditionStatus, CleanlinessLevel } from 'database';

export class InspectionItemDto {
  @IsString()
  itemCode: string;

  @IsString()
  photoStepCode: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsEnum(ConditionStatus)
  conditionStatus: ConditionStatus;

  @IsOptional()
  @IsString()
  conditionNote?: string;

  @IsEnum(CleanlinessLevel)
  cleanlinessLevel: CleanlinessLevel;

  @IsOptional()
  @IsString()
  cleanlinessNote?: string;

  @IsOptional()
  @IsArray()
  detailCloseups?: Array<{ url: string; description?: string }>;
}

export class CreateInspectionDto {
  @IsString()
  bookingId: string;

  @IsEnum(InspectionType)
  type: InspectionType;

  @IsEnum(InspectionMode)
  mode: InspectionMode;

  @IsEnum(InspectionCreator)
  createdBy: InspectionCreator;

  @IsOptional()
  @IsBoolean()
  delegated?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999999)
  mileageValue?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  energyLevelPercent?: number;

  @IsOptional()
  @IsObject()
  documentsPresent?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  accessoriesChecklist?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  dashboardWarnings?: string[];

  @IsOptional()
  @IsObject()
  metadata?: { latitude?: number; longitude?: number; [key: string]: unknown };

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InspectionItemDto)
  items?: InspectionItemDto[];
}
