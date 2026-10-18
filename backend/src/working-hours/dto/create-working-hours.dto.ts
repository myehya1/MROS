import { IsInt, IsString, Matches, Max, Min } from 'class-validator';

export class CreateWorkingHoursDto {
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek!: number;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'startTime must be in HH:mm format',
  })
  startTime!: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'endTime must be in HH:mm format',
  })
  endTime!: string;

  @IsInt()
  @Min(1)
  minStaff!: number;
}
