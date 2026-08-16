import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateJobRoleDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  color?: string;
}
