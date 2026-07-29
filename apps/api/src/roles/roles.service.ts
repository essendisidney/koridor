import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivityType, SystemRole } from '@prisma/client';
import { ROLE_PERMISSIONS } from '@koridor/shared';
import { ActivitiesService } from '../activities/activities.service';
import { AuditService } from '../audit/audit.service';
import { notDeleted, softDeleteData } from '../common/helpers/soft-delete.helpers';
import { permissionsForRoles } from '../common/utils/permissions.util';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly activities: ActivitiesService,
  ) {}

  async assign(actorId: string, userId: string, role: SystemRole) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, ...notDeleted },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.prisma.userRole.findFirst({
      where: { userId, role, ...notDeleted },
    });
    if (existing) {
      throw new ConflictException('User already has this role');
    }

    const assigned = await this.prisma.userRole.create({
      data: {
        userId,
        role,
        createdBy: actorId,
      },
    });

    await Promise.all([
      this.audit.log({
        action: 'ROLE_ASSIGNED',
        entityType: 'UserRole',
        entityId: assigned.id,
        actorId,
        after: { userId, role },
      }),
      this.activities.create({
        type: ActivityType.ROLE_ASSIGNED,
        title: 'Role assigned',
        description: role,
        actorId,
        entityType: 'User',
        entityId: userId,
        metadata: { role },
      }),
    ]);

    return assigned;
  }

  async remove(actorId: string, userId: string, role: SystemRole) {
    const existing = await this.prisma.userRole.findFirst({
      where: { userId, role, ...notDeleted },
    });
    if (!existing) {
      throw new NotFoundException('Role assignment not found');
    }

    await this.prisma.userRole.update({
      where: { id: existing.id },
      data: softDeleteData(actorId),
    });

    await Promise.all([
      this.audit.log({
        action: 'ROLE_REMOVED',
        entityType: 'UserRole',
        entityId: existing.id,
        actorId,
        before: { userId, role },
      }),
      this.activities.create({
        type: ActivityType.ROLE_REMOVED,
        title: 'Role removed',
        description: role,
        actorId,
        entityType: 'User',
        entityId: userId,
        metadata: { role },
      }),
    ]);

    return { removed: true, userId, role };
  }

  async getMyPermissions(userId: string) {
    const roles = await this.prisma.userRole.findMany({
      where: { userId, ...notDeleted },
      select: { role: true },
    });

    const roleNames = roles.map((r) => r.role);
    const permissions = permissionsForRoles(roleNames);

    return {
      roles: roleNames,
      permissions,
      rolePermissions: Object.fromEntries(
        roleNames.map((role) => [role, ROLE_PERMISSIONS[role] ?? []]),
      ),
    };
  }
}
