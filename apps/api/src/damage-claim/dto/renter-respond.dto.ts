import { IsString, IsIn, IsOptional } from 'class-validator';

export class RenterRespondDto {
  @IsString()
  @IsIn(['accept', 'contest'])
  response: 'accept' | 'contest';

  @IsOptional()
  @IsString()
  note?: string;
}
