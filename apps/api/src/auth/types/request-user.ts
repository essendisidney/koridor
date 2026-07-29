export interface RequestUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  mfaEnabled: boolean;
  organisationId: string | null;
  roles: string[];
  permissions: string[];
}
