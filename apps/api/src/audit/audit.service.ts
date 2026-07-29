import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { buildPaginatedMeta } from '../common/dto/pagination.dto';
import { notDeleted } from '../common/helpers/soft-delete.helpers';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateAuditLogInput {
  action: string;
  entityType: string;
  entityId?: string | null;
  actorId?: string | null;
  organisationId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: CreateAuditLogInput) {
    return this.prisma.auditLog.create({
      data: {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? undefined,
        actorId: input.actorId ?? undefined,
        organisationId: input.organisationId ?? undefined,
        ipAddress: input.ipAddress ?? undefined,
        userAgent: input.userAgent ?? undefined,
        before: input.before,
        after: input.after,
        metadata: input.metadata,
        createdBy: input.actorId ?? undefined,
      },
    });
  }

  async list(params: {
    page: number;
    limit: number;
    organisationId?: string;
    actorId?: string;
    action?: string;
    entityType?: string;
  }) {
    const where = {
      ...notDeleted,
      ...(params.organisationId
        ? { organisationId: params.organisationId }
        : {}),
      ...(params.actorId ? { actorId: params.actorId } : {}),
      ...(params.action ? { action: params.action } : {}),
      ...(params.entityType ? { entityType: params.entityType } : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
    ]);

    return {
      data,
      meta: buildPaginatedMeta(params.page, params.limit, total),
    };
  }
}
