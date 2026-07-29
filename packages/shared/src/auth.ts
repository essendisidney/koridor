export interface JwtPayload {
  sub: string;
  email: string;
  organisationId?: string | null;
  roles: string[];
  permissions: string[];
  type: 'access' | 'refresh';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  emailVerified: boolean;
  mfaEnabled: boolean;
  organisationId?: string | null;
  roles: string[];
  permissions: string[];
}
