/** Platform-level and organisation-scoped roles for Koridor RBAC. */
export enum SystemRole {
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
  BUYER = 'BUYER',
  EXPORTER = 'EXPORTER',
  FARMER = 'FARMER',
  COOPERATIVE = 'COOPERATIVE',
  LOGISTICS_PROVIDER = 'LOGISTICS_PROVIDER',
  BANK = 'BANK',
  INSURANCE = 'INSURANCE',
  GOVERNMENT_OFFICER = 'GOVERNMENT_OFFICER',
  CHAMBER_OF_COMMERCE = 'CHAMBER_OF_COMMERCE',
}

export enum OrganisationMemberRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

export const SYSTEM_ROLE_LABELS: Record<SystemRole, string> = {
  [SystemRole.SYSTEM_ADMIN]: 'System Administrator',
  [SystemRole.BUYER]: 'Buyer',
  [SystemRole.EXPORTER]: 'Exporter',
  [SystemRole.FARMER]: 'Farmer',
  [SystemRole.COOPERATIVE]: 'Cooperative',
  [SystemRole.LOGISTICS_PROVIDER]: 'Logistics Provider',
  [SystemRole.BANK]: 'Bank',
  [SystemRole.INSURANCE]: 'Insurance Company',
  [SystemRole.GOVERNMENT_OFFICER]: 'Government Officer',
  [SystemRole.CHAMBER_OF_COMMERCE]: 'Chamber of Commerce',
};
