import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsObject,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InspectionItemDto } from './create-inspection.dto';

export class UpdateInspectionDto {
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
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InspectionItemDto)
  items?: InspectionItemDto[];
}
