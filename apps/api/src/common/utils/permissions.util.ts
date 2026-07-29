import { Permission, ROLE_PERMISSIONS } from '@koridor/shared';

export function permissionsForRoles(roles: string[]): Permission[] {
  const set = new Set<Permission>();

  for (const role of roles) {
    const perms = ROLE_PERMISSIONS[role] ?? [];
    for (const permission of perms) {
      set.add(permission);
    }
  }

  return Array.from(set);
}

export function hasPermission(
  userPermissions: string[],
  required: Permission,
): boolean {
  if (userPermissions.includes(Permission.ADMIN_ALL)) {
    return true;
  }
  return userPermissions.includes(required);
}

export function hasAnyPermission(
  userPermissions: string[],
  required: Permission[],
): boolean {
  return required.some((p) => hasPermission(userPermissions, p));
}
