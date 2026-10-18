import { IsInt, IsString, Length, Max, Min } from 'class-validator';

export class PunchDto {
  @IsString()
  @Length(6, 6)
  kioskCode!: string;

  @IsInt()
  @Min(10001)
  @Max(99999)
  employeeNumber!: number;

  @IsString()
  password!: string;
}
