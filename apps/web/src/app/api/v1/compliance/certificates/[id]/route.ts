import { NextRequest } from "next/server";
import {
  ActivityType,
  CertificateStatus,
  ComplianceApprovalStatus,
} from "@prisma/client";
import { fail, ok } from "@/lib/http";
import {
  canReviewCompliance,
  requireAuth,
  requireOrgMembership,
  requirePermission,
} from "@/lib/org-access";
import { Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { expiryBucket, recordComplianceEvent } from "@/lib/compliance";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.COMPLIANCE_READ);
    const { id } = await ctx.params;

    const cert = await prisma.complianceCertificate.findFirst({
      where: { id, deletedAt: null },
      include: {
        organisation: { select: { id: true, name: true, slug: true, countryCode: true } },
        contract: { select: { id: true, reference: true, title: true } },
        approvals: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
        },
        events: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!cert) return fail("Certificate not found", 404);

    if (!canReviewCompliance(user)) {
      const membership = await requireOrgMembership(user.id);
      if (cert.organisationId !== membership.organisationId) {
        return fail("Forbidden", 403);
      }
    }

    // Lazy expiry
    if (
      cert.status === CertificateStatus.APPROVED &&
      cert.expiresAt &&
      cert.expiresAt < new Date()
    ) {
      const updated = await prisma.complianceCertificate.update({
        where: { id },
        data: { status: CertificateStatus.EXPIRED },
        include: {
          organisation: { select: { id: true, name: true, slug: true, countryCode: true } },
          contract: { select: { id: true, reference: true, title: true } },
          approvals: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
          events: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
        },
      });
      await recordComplianceEvent({
        certificateId: id,
        type: "CERTIFICATE_EXPIRED",
        message: "Certificate expired",
      });
      return ok({ ...updated, expiryStatus: "expired" });
    }

    return ok({ ...cert, expiryStatus: expiryBucket(cert.expiresAt) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    const { id } = await ctx.params;
    const body = await req.json();
    const action = String(body.action ?? "").toLowerCase();

    const cert = await prisma.complianceCertificate.findFirst({
      where: { id, deletedAt: null },
    });
    if (!cert) return fail("Certificate not found", 404);

    if (action === "submit") {
      await requirePermission(user, Permission.COMPLIANCE_WRITE);
      const membership = await requireOrgMembership(user.id);
      if (cert.organisationId !== membership.organisationId) {
        return fail("Forbidden", 403);
      }
      if (cert.status !== CertificateStatus.DRAFT && cert.status !== CertificateStatus.REJECTED) {
        return fail("Only draft or rejected certificates can be submitted", 409);
      }

      const updated = await prisma.complianceCertificate.update({
        where: { id },
        data: {
          status: CertificateStatus.PENDING_APPROVAL,
          submittedAt: new Date(),
          updatedBy: user.id,
          approvals: {
            create: {
              status: ComplianceApprovalStatus.PENDING,
              createdBy: user.id,
            },
          },
        },
      });

      await recordComplianceEvent({
        certificateId: id,
        type: "CERTIFICATE_SUBMITTED",
        message: "Submitted for approval",
        actorId: user.id,
      });
      await prisma.activity.create({
        data: {
          type: ActivityType.CERTIFICATE_SUBMITTED,
          title: "Certificate submitted",
          description: cert.title,
          actorId: user.id,
          organisationId: membership.organisationId,
          entityType: "ComplianceCertificate",
          entityId: id,
        },
      });
      return ok(updated);
    }

    if (action === "review") {
      if (!canReviewCompliance(user)) return fail("Forbidden", 403);
      await requirePermission(user, Permission.COMPLIANCE_REVIEW);

      const decision = String(body.decision ?? "").toUpperCase();
      const reviewNotes = body.reviewNotes
        ? String(body.reviewNotes)
        : undefined;
      if (decision !== "APPROVED" && decision !== "REJECTED") {
        return fail("decision must be APPROVED or REJECTED", 400);
      }
      if (cert.status !== CertificateStatus.PENDING_APPROVAL) {
        return fail("Only pending certificates can be reviewed", 409);
      }

      const approved = decision === "APPROVED";
      const updated = await prisma.$transaction(async (tx) => {
        const next = await tx.complianceCertificate.update({
          where: { id },
          data: {
            status: approved
              ? CertificateStatus.APPROVED
              : CertificateStatus.REJECTED,
            approvedAt: approved ? new Date() : null,
            issuedAt: approved ? new Date() : cert.issuedAt,
            updatedBy: user.id,
          },
        });
        await tx.complianceApproval.updateMany({
          where: {
            certificateId: id,
            status: ComplianceApprovalStatus.PENDING,
            deletedAt: null,
          },
          data: {
            status: approved
              ? ComplianceApprovalStatus.APPROVED
              : ComplianceApprovalStatus.REJECTED,
            reviewerId: user.id,
            reviewNotes,
            reviewedAt: new Date(),
            updatedBy: user.id,
          },
        });
        return next;
      });

      await recordComplianceEvent({
        certificateId: id,
        type: approved ? "CERTIFICATE_APPROVED" : "CERTIFICATE_REJECTED",
        message: reviewNotes ?? (approved ? "Approved" : "Rejected"),
        actorId: user.id,
      });

      await prisma.activity.create({
        data: {
          type: approved
            ? ActivityType.CERTIFICATE_APPROVED
            : ActivityType.CERTIFICATE_REJECTED,
          title: approved ? "Certificate approved" : "Certificate rejected",
          description: cert.title,
          actorId: user.id,
          organisationId: cert.organisationId,
          entityType: "ComplianceCertificate",
          entityId: id,
        },
      });

      await prisma.notification.create({
        data: {
          userId: cert.createdById,
          title: approved ? "Certificate approved" : "Certificate rejected",
          body: approved
            ? `${cert.title} has been approved.`
            : reviewNotes || `${cert.title} was rejected.`,
          link: `/dashboard/compliance/${id}`,
        },
      });

      return ok(updated);
    }

    return fail("action must be submit or review", 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(
      message,
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400,
    );
  }
}
