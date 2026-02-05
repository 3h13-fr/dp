import { IsString, IsOptional, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { FuelType, TransmissionType, DriveType, SpecSource } from 'database';

export class ValidateVinDto {
  @IsString()
  vin!: string;
}

export class SuggestMakeDto {
  @IsString()
  name!: string;
}

export class SuggestModelDto {
  @IsString()
  makeId!: string;

  @IsString()
  name!: string;
}

export class ConfirmSpecsDto {
  @IsString()
  vehicleId!: string;

  @IsOptional()
  @IsEnum(FuelType)
  fuelType?: FuelType;

  @IsOptional()
  @IsEnum(TransmissionType)
  transmissionType?: TransmissionType;

  @IsOptional()
  @IsEnum(DriveType)
  driveType?: DriveType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(400)
  topSpeedKmh?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(30)
  zeroTo100S?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  powerKw?: number;

  @IsOptional()
  @IsEnum(SpecSource)
  source?: SpecSource;
}

export class CreateVehicleDto {
  @IsString()
  vin!: string;

  @IsString()
  makeId!: string;

  @IsString()
  modelId!: string;

  @IsNumber()
  @Min(1990)
  @Max(2030)
  modelYear!: number;

  @IsOptional()
  @IsString()
  trimLabel?: string;
}
