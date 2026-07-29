import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AuthTokens, AuthUser, JwtPayload } from '@koridor/shared';
import { ActivityType, SystemRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { ActivitiesService } from '../activities/activities.service';
import { AuditService } from '../audit/audit.service';
import { notDeleted } from '../common/helpers/soft-delete.helpers';
import { parseDurationToSeconds } from '../common/utils/duration.util';
import { permissionsForRoles } from '../common/utils/permissions.util';
import { hashToken } from '../common/utils/token.util';
import { PrismaService } from '../prisma/prisma.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { RequestUser } from './types/request-user';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly activities: ActivitiesService,
  ) {}

  async register(
    dto: RegisterDto,
    meta?: { ipAddress?: string; userAgent?: string },
  ) {
    const email = dto.email.toLowerCase().trim();

    const existing = await this.prisma.user.findFirst({
      where: { email, ...notDeleted },
    });
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const role =
      dto.role && dto.role !== SystemRole.SYSTEM_ADMIN ? dto.role : undefined;

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        phone: dto.phone?.trim(),
        settings: { create: {} },
        ...(role
          ? {
              roles: {
                create: { role },
              },
            }
          : {}),
      },
      include: {
        roles: { where: notDeleted },
        memberships: { where: notDeleted, take: 1 },
      },
    });

    await Promise.all([
      this.audit.log({
        action: 'USER_REGISTERED',
        entityType: 'User',
        entityId: user.id,
        actorId: user.id,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        after: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      }),
      this.activities.create({
        type: ActivityType.USER_REGISTERED,
        title: 'Account created',
        description: `${user.firstName} ${user.lastName} registered`,
        actorId: user.id,
        entityType: 'User',
        entityId: user.id,
      }),
    ]);

    const tokens = await this.issueTokens(user.id, meta);
    return {
      user: this.toAuthUser(user),
      ...tokens,
    };
  }

  async login(
    dto: LoginDto,
    meta?: { ipAddress?: string; userAgent?: string },
  ) {
    const email = dto.email.toLowerCase().trim();

    const user = await this.prisma.user.findFirst({
      where: { email, ...notDeleted },
      include: {
        roles: { where: notDeleted },
        memberships: {
          where: notDeleted,
          orderBy: { joinedAt: 'asc' },
          take: 1,
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.issueTokens(user.id, meta);

    await Promise.all([
      this.audit.log({
        action: 'USER_LOGIN',
        entityType: 'User',
        entityId: user.id,
        actorId: user.id,
        organisationId: user.memberships[0]?.organisationId,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      }),
      this.activities.create({
        type: ActivityType.USER_LOGIN,
        title: 'Signed in',
        actorId: user.id,
        organisationId: user.memberships[0]?.organisationId,
        entityType: 'User',
        entityId: user.id,
      }),
    ]);

    return {
      user: this.toAuthUser(user),
      ...tokens,
    };
  }

  async refresh(
    refreshToken: string,
    meta?: { ipAddress?: string; userAgent?: string },
  ) {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const tokenHash = hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        userId: payload.sub,
        revokedAt: null,
        ...notDeleted,
        expiresAt: { gt: new Date() },
      },
    });

    if (!stored) {
      throw new UnauthorizedException('Refresh token revoked or expired');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(payload.sub, meta);
  }

  async logout(
    userId: string,
    refreshToken?: string,
    meta?: { ipAddress?: string; userAgent?: string },
  ) {
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await this.prisma.refreshToken.updateMany({
        where: {
          userId,
          tokenHash,
          revokedAt: null,
          ...notDeleted,
        },
        data: { revokedAt: new Date() },
      });
    } else {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null, ...notDeleted },
        data: { revokedAt: new Date() },
      });
    }

    await Promise.all([
      this.audit.log({
        action: 'USER_LOGOUT',
        entityType: 'User',
        entityId: userId,
        actorId: userId,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      }),
      this.activities.create({
        type: ActivityType.USER_LOGOUT,
        title: 'Signed out',
        actorId: userId,
        entityType: 'User',
        entityId: userId,
      }),
    ]);

    return { loggedOut: true };
  }

  async getCurrentUser(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, ...notDeleted, isActive: true },
      include: {
        roles: { where: notDeleted },
        memberships: {
          where: notDeleted,
          orderBy: { joinedAt: 'asc' },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.toAuthUser(user);
  }

  private async issueTokens(
    userId: string,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthTokens> {
    const user = await this.prisma.user.findFirstOrThrow({
      where: { id: userId, ...notDeleted },
      include: {
        roles: { where: notDeleted },
        memberships: {
          where: notDeleted,
          orderBy: { joinedAt: 'asc' },
          take: 1,
        },
      },
    });

    const roles = user.roles.map((r) => r.role);
    const permissions = permissionsForRoles(roles).map(String);
    const organisationId = user.memberships[0]?.organisationId ?? null;

    const accessExpiresIn = this.config.getOrThrow<string>(
      'jwt.accessExpiresIn',
    );
    const refreshExpiresIn = this.config.getOrThrow<string>(
      'jwt.refreshExpiresIn',
    );
    const expiresIn = parseDurationToSeconds(accessExpiresIn);
    const refreshTtl = parseDurationToSeconds(refreshExpiresIn);

    const basePayload = {
      sub: user.id,
      email: user.email,
      organisationId,
      roles,
      permissions,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { ...basePayload, type: 'access' } satisfies JwtPayload,
        {
          secret: this.config.getOrThrow<string>('jwt.accessSecret'),
          expiresIn: accessExpiresIn as `${number}m`,
        },
      ),
      this.jwt.signAsync(
        { ...basePayload, type: 'refresh' } satisfies JwtPayload,
        {
          secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
          expiresIn: refreshExpiresIn as `${number}d`,
        },
      ),
    ]);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
        userAgent: meta?.userAgent,
        ipAddress: meta?.ipAddress,
        createdBy: user.id,
      },
    });

    return { accessToken, refreshToken, expiresIn };
  }

  private toAuthUser(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    avatarUrl: string | null;
    emailVerified: boolean;
    mfaEnabled: boolean;
    roles: { role: string }[];
    memberships: { organisationId: string }[];
  }): AuthUser {
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
      permissions: permissionsForRoles(roles).map(String),
    };
  }

  /** Expose for typing helpers in controllers if needed. */
  asRequestUser(user: AuthUser): RequestUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? null,
      avatarUrl: user.avatarUrl ?? null,
      emailVerified: user.emailVerified,
      mfaEnabled: user.mfaEnabled,
      organisationId: user.organisationId ?? null,
      roles: user.roles,
      permissions: user.permissions,
    };
  }
}
