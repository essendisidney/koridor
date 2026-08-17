import { NextRequest } from "next/server";
import { AuthUser, requireUser } from "@/lib/auth-server";
import { hasPermission, Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { pickPrimaryMembership } from "@/lib/membership";

export async function requireAuth(req: NextRequest) {
  return requireUser(req);
}

export async function requirePermission(
  user: AuthUser,
  permission: Permission,
) {
  if (!hasPermission(user.permissions, permission)) {
    throw new Error("Forbidden");
  }
}

export async function getMembership(userId: string) {
  const memberships = await prisma.organisationMember.findMany({
    where: { userId, deletedAt: null },
    include: { organisation: true },
    orderBy: { joinedAt: "asc" },
  });
  return pickPrimaryMembership(memberships);
}

export async function requireOrgMembership(userId: string) {
  const membership = await getMembership(userId);
  if (!membership || membership.organisation.deletedAt) {
    throw new Error("No organisation linked to this account");
  }
  return membership;
}

export function isAdmin(user: AuthUser) {
  return (
    user.roles.includes("SYSTEM_ADMIN") ||
    hasPermission(user.permissions, Permission.ADMIN_ALL) ||
    hasPermission(user.permissions, Permission.TRUST_REVIEW)
  );
}

export function canReviewCompliance(user: AuthUser) {
  return (
    isAdmin(user) ||
    hasPermission(user.permissions, Permission.COMPLIANCE_REVIEW)
  );
}

export function canOperateFinance(user: AuthUser) {
  return (
    isAdmin(user) ||
    hasPermission(user.permissions, Permission.FINANCE_OPERATE) ||
    hasPermission(user.permissions, Permission.ADMIN_ALL)
  );
}

export function canOperateLogistics(user: AuthUser) {
  return (
    isAdmin(user) ||
    hasPermission(user.permissions, Permission.LOGISTICS_OPERATE) ||
    hasPermission(user.permissions, Permission.ADMIN_ALL)
  );
}
