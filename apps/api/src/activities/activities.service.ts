import { Injectable } from '@nestjs/common';
import { ActivityType, type Prisma } from '@prisma/client';
import { buildPaginatedMeta } from '../common/dto/pagination.dto';
import { notDeleted } from '../common/helpers/soft-delete.helpers';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateActivityInput {
  type: ActivityType;
  title: string;
  description?: string | null;
  actorId?: string | null;
  organisationId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateActivityInput) {
    return this.prisma.activity.create({
      data: {
        type: input.type,
        title: input.title,
        description: input.description ?? undefined,
        actorId: input.actorId ?? undefined,
        organisationId: input.organisationId ?? undefined,
        entityType: input.entityType ?? undefined,
        entityId: input.entityId ?? undefined,
        metadata: input.metadata,
        createdBy: input.actorId ?? undefined,
      },
    });
  }

  async listForUser(params: {
    userId: string;
    organisationId?: string | null;
    page: number;
    limit: number;
    type?: ActivityType;
  }) {
    const memberships = await this.prisma.organisationMember.findMany({
      where: { userId: params.userId, ...notDeleted },
      select: { organisationId: true },
    });

    const orgIds = memberships.map((m) => m.organisationId);
    const scopedOrgId = params.organisationId;

    const where: Prisma.ActivityWhereInput = {
      ...notDeleted,
      ...(params.type ? { type: params.type } : {}),
      OR: [
        { actorId: params.userId },
        ...(scopedOrgId
          ? [{ organisationId: scopedOrgId }]
          : orgIds.length > 0
            ? [{ organisationId: { in: orgIds } }]
            : []),
      ],
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.activity.count({ where }),
      this.prisma.activity.findMany({
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
              avatarUrl: true,
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
