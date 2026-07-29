import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { JwtPayload } from '@koridor/shared';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { notDeleted } from '../../common/helpers/soft-delete.helpers';
import { permissionsForRoles } from '../../common/utils/permissions.util';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../types/request-user';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.accessSecret'),
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, ...notDeleted, isActive: true },
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
      throw new UnauthorizedException('User not found or inactive');
    }

    const roles = user.roles.map((r) => r.role);
    const permissions = permissionsForRoles(roles).map(String);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
      mfaEnabled: user.mfaEnabled,
      organisationId:
        user.memberships[0]?.organisationId ?? payload.organisationId ?? null,
      roles,
      permissions,
    };
  }
}
