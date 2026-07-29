import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/http";
import {
  requireAuth,
  requireOrgMembership,
  requirePermission,
} from "@/lib/org-access";
import { Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { recomputeTrustScore } from "@/lib/trust-score";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.TRUST_READ);
    const membership = await requireOrgMembership(user.id);

    let profile = await prisma.trustProfile.findFirst({
      where: { organisationId: membership.organisationId, deletedAt: null },
    });
    if (!profile) {
      profile = await recomputeTrustScore(membership.organisationId, user.id);
    }

    return ok({
      ...profile,
      organisation: {
        id: membership.organisation.id,
        name: membership.organisation.name,
        verificationStatus: membership.organisation.verificationStatus,
        type: membership.organisation.type,
        countryCode: membership.organisation.countryCode,
        city: membership.organisation.city,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.TRUST_WRITE);
    const membership = await requireOrgMembership(user.id);
    const profile = await recomputeTrustScore(membership.organisationId, user.id);
    return ok({
      ...profile,
      organisation: {
        id: membership.organisation.id,
        name: membership.organisation.name,
        verificationStatus: membership.organisation.verificationStatus,
        type: membership.organisation.type,
        countryCode: membership.organisation.countryCode,
        city: membership.organisation.city,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400);
  }
}
