import { NextRequest } from "next/server";
import {
  ActivityType,
  DocumentStatus,
  KycStatus,
  OrganisationStatus,
  VerificationCaseStatus,
  VerificationEventType,
  VerificationStatus,
} from "@prisma/client";
import { fail, ok } from "@/lib/http";
import { isAdmin, requireAuth, requirePermission } from "@/lib/org-access";
import { Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { recomputeTrustScore } from "@/lib/trust-score";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    if (!isAdmin(user)) return fail("Forbidden", 403);
    await requirePermission(user, Permission.TRUST_REVIEW);

    const { id } = await ctx.params;
    const body = await req.json();
    const decision = String(body.decision ?? "").toUpperCase();
    const reviewNotes = body.reviewNotes
      ? String(body.reviewNotes)
      : undefined;
    const approveKyc = body.approveKyc !== false;

    if (decision !== "APPROVED" && decision !== "REJECTED") {
      return fail("decision must be APPROVED or REJECTED", 400);
    }

    const existing = await prisma.verificationCase.findFirst({
      where: { id, deletedAt: null },
      include: { organisation: true },
    });
    if (!existing) return fail("Verification case not found", 404);
    if (existing.status !== VerificationCaseStatus.PENDING) {
      return fail("Only pending cases can be reviewed", 409);
    }

    const approved = decision === "APPROVED";

    await prisma.$transaction(async (tx) => {
      await tx.verificationCase.update({
        where: { id },
        data: {
          status: approved
            ? VerificationCaseStatus.APPROVED
            : VerificationCaseStatus.REJECTED,
          reviewerId: user.id,
          reviewedAt: new Date(),
          reviewNotes,
          updatedBy: user.id,
        },
      });

      await tx.verificationEvent.create({
        data: {
          verificationCaseId: id,
          type: approved
            ? VerificationEventType.APPROVED
            : VerificationEventType.REJECTED,
          message: reviewNotes ?? (approved ? "Approved" : "Rejected"),
          actorId: user.id,
          createdBy: user.id,
        },
      });

      await tx.organisation.update({
        where: { id: existing.organisationId },
        data: {
          verificationStatus: approved
            ? VerificationStatus.VERIFIED
            : VerificationStatus.REJECTED,
          status: approved
            ? OrganisationStatus.ACTIVE
            : existing.organisation.status,
          updatedBy: user.id,
        },
      });

      if (approved) {
        await tx.document.updateMany({
          where: { verificationCaseId: id, deletedAt: null },
          data: { status: DocumentStatus.APPROVED, updatedBy: user.id },
        });

        if (approveKyc && existing.submittedById) {
          await tx.kycProfile.updateMany({
            where: {
              userId: existing.submittedById,
              deletedAt: null,
              status: KycStatus.PENDING,
            },
            data: {
              status: KycStatus.VERIFIED,
              reviewedById: user.id,
              reviewedAt: new Date(),
              reviewNotes: "Verified with organisation KYB approval",
              updatedBy: user.id,
            },
          });
        }
      } else {
        await tx.document.updateMany({
          where: { verificationCaseId: id, deletedAt: null },
          data: { status: DocumentStatus.REJECTED, updatedBy: user.id },
        });
      }

      await tx.activity.create({
        data: {
          type: approved
            ? ActivityType.VERIFICATION_APPROVED
            : ActivityType.VERIFICATION_REJECTED,
          title: approved ? "Verification approved" : "Verification rejected",
          description: reviewNotes,
          actorId: user.id,
          organisationId: existing.organisationId,
          entityType: "VerificationCase",
          entityId: id,
        },
      });

      await tx.auditLog.create({
        data: {
          action: approved ? "VERIFICATION_APPROVED" : "VERIFICATION_REJECTED",
          entityType: "VerificationCase",
          entityId: id,
          actorId: user.id,
          organisationId: existing.organisationId,
          after: { decision, reviewNotes },
        },
      });

      if (existing.submittedById) {
        await tx.notification.create({
          data: {
            userId: existing.submittedById,
            title: approved ? "Organisation verified" : "Verification rejected",
            body: approved
              ? "Your organisation has been verified on Koridor."
              : reviewNotes ||
                "Your verification package was rejected. Please update documents and resubmit.",
            link: "/dashboard/verification",
          },
        });
      }
    });

    await recomputeTrustScore(existing.organisationId, user.id);

    const updated = await prisma.verificationCase.findUnique({
      where: { id },
      include: {
        organisation: true,
        documents: { where: { deletedAt: null } },
        events: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
      },
    });
    return ok(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(
      message,
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400,
    );
  }
}
