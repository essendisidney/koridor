import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Permission } from '@koridor/shared';
import { PERMISSIONS_KEY } from '../../common/decorators/permissions.decorator';
import { hasAnyPermission } from '../../common/utils/permissions.util';
import type { RequestUser } from '../types/request-user';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (!hasAnyPermission(user.permissions, required)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
