import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class GenerateScheduleDto {
  @IsDateString()
  weekStart: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  instructions?: string;
}
