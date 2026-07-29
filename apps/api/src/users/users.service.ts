import { Injectable, NotFoundException } from '@nestjs/common';
import { ActivityType } from '@prisma/client';
import { ActivitiesService } from '../activities/activities.service';
import { AuditService } from '../audit/audit.service';
import { buildPaginatedMeta } from '../common/dto/pagination.dto';
import { notDeleted } from '../common/helpers/soft-delete.helpers';
import { permissionsForRoles } from '../common/utils/permissions.util';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateProfileDto } from './dto/update-profile.dto';

const userPublicSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  avatarUrl: true,
  emailVerified: true,
  mfaEnabled: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  roles: {
    where: notDeleted,
    select: { id: true, role: true, createdAt: true },
  },
  memberships: {
    where: notDeleted,
    select: {
      id: true,
      role: true,
      organisationId: true,
      organisation: {
        select: { id: true, name: true, slug: true, type: true, status: true },
      },
    },
  },
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly activities: ActivitiesService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, ...notDeleted },
      select: userPublicSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const roles = user.roles.map((r) => r.role);
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
      mfaEnabled: user.mfaEnabled,
      organisationId: user.memberships[0]?.organisationId ?? null,
      roles,
      permissions: permissionsForRoles(roles),
      memberships: user.memberships,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const existing = await this.prisma.user.findFirst({
      where: { id: userId, ...notDeleted },
    });

    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName !== undefined
          ? { firstName: dto.firstName.trim() }
          : {}),
        ...(dto.lastName !== undefined
          ? { lastName: dto.lastName.trim() }
          : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone?.trim() || null } : {}),
        ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
        updatedBy: userId,
      },
      select: userPublicSelect,
    });

    await Promise.all([
      this.audit.log({
        action: 'PROFILE_UPDATED',
        entityType: 'User',
        entityId: userId,
        actorId: userId,
        before: {
          firstName: existing.firstName,
          lastName: existing.lastName,
          phone: existing.phone,
          avatarUrl: existing.avatarUrl,
        },
        after: {
          firstName: updated.firstName,
          lastName: updated.lastName,
          phone: updated.phone,
          avatarUrl: updated.avatarUrl,
        },
      }),
      this.activities.create({
        type: ActivityType.PROFILE_UPDATED,
        title: 'Profile updated',
        actorId: userId,
        entityType: 'User',
        entityId: userId,
      }),
    ]);

    const roles = updated.roles.map((r) => r.role);
    return {
      id: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      phone: updated.phone,
      avatarUrl: updated.avatarUrl,
      emailVerified: updated.emailVerified,
      mfaEnabled: updated.mfaEnabled,
      organisationId: updated.memberships[0]?.organisationId ?? null,
      roles,
      permissions: permissionsForRoles(roles),
      memberships: updated.memberships,
      lastLoginAt: updated.lastLoginAt,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async list(params: { page: number; limit: number; search?: string }) {
    const where = {
      ...notDeleted,
      ...(params.search
        ? {
            OR: [
              {
                email: {
                  contains: params.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                firstName: {
                  contains: params.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                lastName: {
                  contains: params.search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: userPublicSelect,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
    ]);

    return {
      data,
      meta: buildPaginatedMeta(params.page, params.limit, total),
    };
  }
}
