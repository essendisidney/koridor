import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivityType,
  OrganisationMemberRole,
  OrganisationType,
  SystemRole,
} from '@prisma/client';
import slugify from 'slugify';
import { ActivitiesService } from '../activities/activities.service';
import { AuditService } from '../audit/audit.service';
import { notDeleted } from '../common/helpers/soft-delete.helpers';
import { generateOpaqueToken } from '../common/utils/token.util';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateOrganisationDto } from './dto/create-organisation.dto';
import type { InviteMemberDto } from './dto/invite-member.dto';
import type { UpdateOrganisationDto } from './dto/update-organisation.dto';

const ORG_TYPE_TO_SYSTEM_ROLE: Partial<Record<OrganisationType, SystemRole>> = {
  [OrganisationType.BUYER]: SystemRole.BUYER,
  [OrganisationType.EXPORTER]: SystemRole.EXPORTER,
  [OrganisationType.FARMER]: SystemRole.FARMER,
  [OrganisationType.COOPERATIVE]: SystemRole.COOPERATIVE,
  [OrganisationType.LOGISTICS_PROVIDER]: SystemRole.LOGISTICS_PROVIDER,
  [OrganisationType.BANK]: SystemRole.BANK,
  [OrganisationType.INSURANCE]: SystemRole.INSURANCE,
  [OrganisationType.GOVERNMENT]: SystemRole.GOVERNMENT_OFFICER,
  [OrganisationType.CHAMBER_OF_COMMERCE]: SystemRole.CHAMBER_OF_COMMERCE,
};

@Injectable()
export class OrganisationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly activities: ActivitiesService,
  ) {}

  async create(userId: string, dto: CreateOrganisationDto) {
    const slug = await this.uniqueSlug(dto.name);
    const systemRole = ORG_TYPE_TO_SYSTEM_ROLE[dto.type];

    const organisation = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organisation.create({
        data: {
          name: dto.name.trim(),
          slug,
          type: dto.type,
          countryCode: dto.countryCode.toUpperCase(),
          registrationNumber: dto.registrationNumber,
          taxId: dto.taxId,
          city: dto.city,
          addressLine1: dto.addressLine1,
          addressLine2: dto.addressLine2,
          postalCode: dto.postalCode,
          website: dto.website,
          description: dto.description,
          ownerId: userId,
          createdBy: userId,
          members: {
            create: {
              userId,
              role: OrganisationMemberRole.OWNER,
              createdBy: userId,
            },
          },
        },
        include: {
          members: {
            where: notDeleted,
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

      if (systemRole) {
        const existingRole = await tx.userRole.findFirst({
          where: { userId, role: systemRole, ...notDeleted },
        });
        if (!existingRole) {
          await tx.userRole.create({
            data: {
              userId,
              role: systemRole,
              createdBy: userId,
            },
          });
        }
      }

      return org;
    });

    await Promise.all([
      this.audit.log({
        action: 'ORG_CREATED',
        entityType: 'Organisation',
        entityId: organisation.id,
        actorId: userId,
        organisationId: organisation.id,
        after: {
          name: organisation.name,
          slug: organisation.slug,
          type: organisation.type,
        },
      }),
      this.activities.create({
        type: ActivityType.ORG_CREATED,
        title: 'Organisation created',
        description: organisation.name,
        actorId: userId,
        organisationId: organisation.id,
        entityType: 'Organisation',
        entityId: organisation.id,
      }),
    ]);

    return organisation;
  }

  async getMine(userId: string) {
    const memberships = await this.prisma.organisationMember.findMany({
      where: { userId, ...notDeleted },
      include: {
        organisation: true,
      },
      orderBy: { joinedAt: 'asc' },
    });

    return memberships
      .filter((m) => m.organisation.deletedAt === null)
      .map((m) => ({
        membershipId: m.id,
        role: m.role,
        joinedAt: m.joinedAt,
        organisation: m.organisation,
      }));
  }

  async getPrimary(userId: string) {
    const membership = await this.prisma.organisationMember.findFirst({
      where: { userId, ...notDeleted },
      include: { organisation: true },
      orderBy: { joinedAt: 'asc' },
    });

    if (!membership || membership.organisation.deletedAt) {
      throw new NotFoundException('No organisation linked to this account');
    }

    return membership.organisation;
  }

  async update(
    organisationId: string,
    userId: string,
    dto: UpdateOrganisationDto,
  ) {
    await this.requireOrgRole(organisationId, userId, [
      OrganisationMemberRole.OWNER,
      OrganisationMemberRole.ADMIN,
    ]);

    const existing = await this.prisma.organisation.findFirst({
      where: { id: organisationId, ...notDeleted },
    });
    if (!existing) {
      throw new NotFoundException('Organisation not found');
    }

    const updated = await this.prisma.organisation.update({
      where: { id: organisationId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.countryCode !== undefined
          ? { countryCode: dto.countryCode.toUpperCase() }
          : {}),
        ...(dto.registrationNumber !== undefined
          ? { registrationNumber: dto.registrationNumber }
          : {}),
        ...(dto.taxId !== undefined ? { taxId: dto.taxId } : {}),
        ...(dto.city !== undefined ? { city: dto.city } : {}),
        ...(dto.addressLine1 !== undefined
          ? { addressLine1: dto.addressLine1 }
          : {}),
        ...(dto.addressLine2 !== undefined
          ? { addressLine2: dto.addressLine2 }
          : {}),
        ...(dto.postalCode !== undefined ? { postalCode: dto.postalCode } : {}),
        ...(dto.website !== undefined ? { website: dto.website } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl } : {}),
        updatedBy: userId,
      },
    });

    await Promise.all([
      this.audit.log({
        action: 'ORG_UPDATED',
        entityType: 'Organisation',
        entityId: organisationId,
        actorId: userId,
        organisationId,
        before: {
          name: existing.name,
          countryCode: existing.countryCode,
          city: existing.city,
        },
        after: {
          name: updated.name,
          countryCode: updated.countryCode,
          city: updated.city,
        },
      }),
      this.activities.create({
        type: ActivityType.ORG_UPDATED,
        title: 'Organisation updated',
        description: updated.name,
        actorId: userId,
        organisationId,
        entityType: 'Organisation',
        entityId: organisationId,
      }),
    ]);

    return updated;
  }

  async listMembers(organisationId: string, userId: string) {
    await this.requireMembership(organisationId, userId);

    return this.prisma.organisationMember.findMany({
      where: { organisationId, ...notDeleted },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            phone: true,
            roles: {
              where: notDeleted,
              select: { role: true },
            },
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async inviteMember(
    organisationId: string,
    userId: string,
    dto: InviteMemberDto,
  ) {
    await this.requireOrgRole(organisationId, userId, [
      OrganisationMemberRole.OWNER,
      OrganisationMemberRole.ADMIN,
    ]);

    const email = dto.email.toLowerCase().trim();
    const role = dto.role ?? OrganisationMemberRole.MEMBER;

    if (role === OrganisationMemberRole.OWNER) {
      throw new ForbiddenException('Cannot invite a new owner');
    }

    const org = await this.prisma.organisation.findFirst({
      where: { id: organisationId, ...notDeleted },
    });
    if (!org) {
      throw new NotFoundException('Organisation not found');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { email, ...notDeleted },
    });
    if (existingUser) {
      const existingMember = await this.prisma.organisationMember.findFirst({
        where: {
          organisationId,
          userId: existingUser.id,
          ...notDeleted,
        },
      });
      if (existingMember) {
        throw new ConflictException('User is already a member');
      }
    }

    const existingInvite = await this.prisma.organisationInvite.findFirst({
      where: {
        organisationId,
        email,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
        ...notDeleted,
      },
    });
    if (existingInvite) {
      throw new ConflictException('An active invite already exists for this email');
    }

    const invite = await this.prisma.organisationInvite.create({
      data: {
        organisationId,
        email,
        role,
        token: generateOpaqueToken(32),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: userId,
      },
    });

    await Promise.all([
      this.audit.log({
        action: 'MEMBER_INVITED',
        entityType: 'OrganisationInvite',
        entityId: invite.id,
        actorId: userId,
        organisationId,
        after: { email, role },
      }),
      this.activities.create({
        type: ActivityType.MEMBER_INVITED,
        title: 'Member invited',
        description: email,
        actorId: userId,
        organisationId,
        entityType: 'OrganisationInvite',
        entityId: invite.id,
      }),
    ]);

    return {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
      token: invite.token,
    };
  }

  private async requireMembership(organisationId: string, userId: string) {
    const membership = await this.prisma.organisationMember.findFirst({
      where: { organisationId, userId, ...notDeleted },
    });
    if (!membership) {
      throw new ForbiddenException('You are not a member of this organisation');
    }
    return membership;
  }

  private async requireOrgRole(
    organisationId: string,
    userId: string,
    roles: OrganisationMemberRole[],
  ) {
    const membership = await this.requireMembership(organisationId, userId);
    if (!roles.includes(membership.role)) {
      throw new ForbiddenException('Insufficient organisation role');
    }
    return membership;
  }

  private async uniqueSlug(name: string): Promise<string> {
    const base =
      slugify(name, { lower: true, strict: true, trim: true }) || 'organisation';
    let slug = base;
    let i = 1;

    while (
      await this.prisma.organisation.findFirst({
        where: { slug, ...notDeleted },
        select: { id: true },
      })
    ) {
      slug = `${base}-${i++}`;
    }

    return slug;
  }
}
