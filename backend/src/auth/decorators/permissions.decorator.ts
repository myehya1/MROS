import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const AVAILABLE_PERMISSIONS = [
  'MANAGE_EMPLOYEES',
  'MANAGE_JOB_ROLES',
  'EDIT_SCHEDULE',
  'VIEW_TIME_ENTRIES',
] as const;

export type Permission = (typeof AVAILABLE_PERMISSIONS)[number];
