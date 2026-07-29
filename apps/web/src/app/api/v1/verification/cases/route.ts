import { NextRequest } from "next/server";
import {
  ActivityType,
  VerificationCaseStatus,
  VerificationEventType,
  VerificationStatus,
} from "@prisma/client";
import { fail, ok } from "@/lib/http";
import {
  isAdmin,
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
    if (!isAdmin(user)) {
      return fail("Forbidden", 403);
    }
    await requirePermission(user, Permission.TRUST_REVIEW);

    const status = req.nextUrl.searchParams.get("status") ?? undefined;
    const cases = await prisma.verificationCase.findMany({
      where: {
        deletedAt: null,
        ...(status
          ? { status: status as VerificationCaseStatus }
          : { status: VerificationCaseStatus.PENDING }),
      },
      include: {
        organisation: {
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
            countryCode: true,
            verificationStatus: true,
          },
        },
        documents: { where: { deletedAt: null } },
        events: { orderBy: { createdAt: "asc" }, where: { deletedAt: null } },
      },
      orderBy: { submittedAt: "asc" },
    });
    return ok(cases);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.TRUST_WRITE);
    const membership = await requireOrgMembership(user.id);
    const body = await req.json().catch(() => ({}));
    const notes = body.notes ? String(body.notes) : undefined;
    const documentIds: string[] = Array.isArray(body.documentIds)
      ? body.documentIds.map(String)
      : [];

    const open = await prisma.verificationCase.findFirst({
      where: {
        organisationId: membership.organisationId,
        deletedAt: null,
        status: {
          in: [VerificationCaseStatus.DRAFT, VerificationCaseStatus.PENDING],
        },
      },
    });
    if (open) {
      return fail("A verification case is already open for this organisation", 409);
    }

    const docs = documentIds.length
      ? await prisma.document.findMany({
          where: {
            id: { in: documentIds },
            organisationId: membership.organisationId,
            deletedAt: null,
          },
        })
      : [];

    const created = await prisma.$transaction(async (tx) => {
      const verificationCase = await tx.verificationCase.create({
        data: {
          organisationId: membership.organisationId,
          status: VerificationCaseStatus.PENDING,
          submittedById: user.id,
          submittedAt: new Date(),
          notes,
          createdBy: user.id,
          updatedBy: user.id,
        },
      });

      if (docs.length) {
        await tx.document.updateMany({
          where: { id: { in: docs.map((d) => d.id) } },
          data: { verificationCaseId: verificationCase.id },
        });
      }

      await tx.verificationEvent.create({
        data: {
          verificationCaseId: verificationCase.id,
          type: VerificationEventType.SUBMITTED,
          message: "KYB package submitted for review",
          actorId: user.id,
          createdBy: user.id,
        },
      });

      await tx.organisation.update({
        where: { id: membership.organisationId },
        data: {
          verificationStatus: VerificationStatus.PENDING,
          updatedBy: user.id,
        },
      });

      await tx.activity.create({
        data: {
          type: ActivityType.VERIFICATION_SUBMITTED,
          title: "Verification submitted",
          description: "Organisation KYB submitted for review",
          actorId: user.id,
          organisationId: membership.organisationId,
          entityType: "VerificationCase",
          entityId: verificationCase.id,
        },
      });

      await tx.auditLog.create({
        data: {
          action: "VERIFICATION_SUBMITTED",
          entityType: "VerificationCase",
          entityId: verificationCase.id,
          actorId: user.id,
          organisationId: membership.organisationId,
        },
      });

      await tx.notification.create({
        data: {
          userId: user.id,
          title: "Verification submitted",
          body: "Your KYB package is pending review by Koridor operations.",
          link: "/dashboard/verification",
        },
      });

      return verificationCase;
    });

    const full = await prisma.verificationCase.findUnique({
      where: { id: created.id },
      include: {
        documents: { where: { deletedAt: null } },
        events: { orderBy: { createdAt: "asc" } },
      },
    });

    await recomputeTrustScore(membership.organisationId, user.id);
    return ok(full, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}
