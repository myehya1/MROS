import { IsEmail, IsNotEmpty, IsUUID, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  firstName!: string;

  @IsNotEmpty()
  lastName!: string;

  @IsEmail()
  email!: string;

  @MinLength(8)
  password!: string;

  @IsUUID()
  systemRoleId!: string;
}
