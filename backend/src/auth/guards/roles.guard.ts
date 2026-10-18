import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ROLES_KEY } from '../decorators/roles.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

interface AuthenticatedRequest {
  user?: {
    userId: string;
    email: string;
    restaurantId: string;
    role: string;
    permissions?: string[];
  };
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    const requiredPerms =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredRoles.length === 0 && requiredPerms.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) throw new ForbiddenException('User not authenticated.');

    // Owner bypasses all role and permission checks
    if (user.role === 'Owner') return true;

    // Check explicit role requirement (e.g. @Roles('Employee'))
    if (requiredRoles.length && requiredRoles.includes(user.role)) return true;

    // Check permission requirement (e.g. @RequirePermission('EDIT_SCHEDULE'))
    if (
      requiredPerms.length &&
      requiredPerms.some((p) => (user.permissions ?? []).includes(p))
    ) {
      return true;
    }

    throw new ForbiddenException('Insufficient permissions.');
  }
}
