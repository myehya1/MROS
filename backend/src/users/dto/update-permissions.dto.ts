import { IsArray, IsIn, IsString } from 'class-validator';
import {
  AVAILABLE_PERMISSIONS,
  Permission,
} from '../../auth/decorators/permissions.decorator';

export class UpdatePermissionsDto {
  @IsArray()
  @IsString({ each: true })
  @IsIn(AVAILABLE_PERMISSIONS, { each: true })
  permissions!: Permission[];
}
