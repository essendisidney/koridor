import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/http";
import {
  canReviewCompliance,
  requireAuth,
  requireOrgMembership,
  requirePermission,
} from "@/lib/org-access";
import { Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { expiryBucket } from "@/lib/compliance";

export const runtime = "nodejs";

/** Expiry dashboard summary for current org (or all for reviewers). */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.COMPLIANCE_READ);

    const scopeAll =
      req.nextUrl.searchParams.get("scope") === "all" &&
      canReviewCompliance(user);

    let organisationId: string | undefined;
    if (!scopeAll) {
      const membership = await requireOrgMembership(user.id);
      organisationId = membership.organisationId;
    }

    // Lazy expire
    await prisma.complianceCertificate.updateMany({
      where: {
        deletedAt: null,
        status: "APPROVED",
        expiresAt: { lt: new Date() },
        ...(organisationId ? { organisationId } : {}),
      },
      data: { status: "EXPIRED" },
    });

    const certs = await prisma.complianceCertificate.findMany({
      where: {
        deletedAt: null,
        ...(organisationId ? { organisationId } : {}),
        status: { in: ["APPROVED", "EXPIRED", "PENDING_APPROVAL"] },
      },
      select: {
        id: true,
        reference: true,
        title: true,
        type: true,
        status: true,
        expiresAt: true,
        organisationId: true,
      },
      orderBy: { expiresAt: "asc" },
      take: 200,
    });

    const summary = {
      expired: 0,
      expiringSoon: 0,
      valid: 0,
      pending: 0,
      none: 0,
    };

    const items = certs.map((c) => {
      const bucket = expiryBucket(c.expiresAt);
      if (c.status === "PENDING_APPROVAL") summary.pending += 1;
      else if (bucket === "expired") summary.expired += 1;
      else if (bucket === "expiring_soon") summary.expiringSoon += 1;
      else if (bucket === "valid") summary.valid += 1;
      else summary.none += 1;
      return { ...c, expiryStatus: bucket };
    });

    return ok({ summary, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}
