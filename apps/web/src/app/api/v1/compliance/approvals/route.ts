import { NextRequest } from "next/server";
import { CertificateStatus } from "@prisma/client";
import { fail, ok } from "@/lib/http";
import {
  canReviewCompliance,
  requireAuth,
  requirePermission,
} from "@/lib/org-access";
import { Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (!canReviewCompliance(user)) return fail("Forbidden", 403);
    await requirePermission(user, Permission.COMPLIANCE_REVIEW);

    const status = req.nextUrl.searchParams.get("status") ?? "PENDING_APPROVAL";

    const certs = await prisma.complianceCertificate.findMany({
      where: {
        deletedAt: null,
        status: status as CertificateStatus,
      },
      include: {
        organisation: {
          select: { id: true, name: true, slug: true, countryCode: true },
        },
        contract: { select: { id: true, reference: true } },
      },
      orderBy: { submittedAt: "asc" },
      take: 100,
    });

    return ok(certs);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}
