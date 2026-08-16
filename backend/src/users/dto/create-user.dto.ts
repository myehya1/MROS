import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { ContractType } from '@prisma/client';

export class CreateUserDto {
  @IsNotEmpty()
  firstName!: string;

  @IsNotEmpty()
  lastName!: string;

  @IsNotEmpty()
  @IsString()
  username!: string;

  @IsEmail()
  email!: string;

  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsUUID()
  systemRoleId!: string;

  @IsOptional()
  @IsUUID()
  jobRoleId?: string;

  @IsNotEmpty()
  contractType!: ContractType;

  @IsDateString()
  contractStartDate!: string;

  @IsOptional()
  @IsDateString()
  contractEndDate?: string;
}
