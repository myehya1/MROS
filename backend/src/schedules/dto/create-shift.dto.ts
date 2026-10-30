import { IsDateString, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateShiftDto {
  @IsString()
  userId: string;

  @IsString()
  jobRoleId: string;

  @IsDateString()
  date: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endTime: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
