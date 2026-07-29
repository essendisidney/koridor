import { createHash } from "crypto";
import { NextRequest } from "next/server";
import { ActivityType, IdDocumentType, KycStatus } from "@prisma/client";
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

const ID_TYPES = new Set(Object.values(IdDocumentType));

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.TRUST_READ);
    const profile = await prisma.kycProfile.findFirst({
      where: { userId: user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return ok(profile);
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
    const body = await req.json();

    const idDocumentType = String(body.idDocumentType ?? "");
    const idNumber = String(body.idNumber ?? "").trim();
    const countryCode = String(body.countryCode ?? "")
      .trim()
      .toUpperCase();

    if (!ID_TYPES.has(idDocumentType as IdDocumentType)) {
      return fail("Invalid ID document type", 400);
    }
    if (idNumber.length < 4) return fail("ID number is required", 400);
    if (countryCode.length !== 2) return fail("countryCode must be ISO-2", 400);

    const idNumberHash = createHash("sha256").update(idNumber).digest("hex");
    const idNumberLast4 = idNumber.slice(-4);

    const existing = await prisma.kycProfile.findFirst({
      where: { userId: user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });

    const data = {
      status: KycStatus.PENDING,
      idDocumentType: idDocumentType as IdDocumentType,
      idNumberHash,
      idNumberLast4,
      countryCode,
      submittedAt: new Date(),
      reviewedAt: null,
      reviewedById: null,
      reviewNotes: null,
      updatedBy: user.id,
    };

    const profile = existing
      ? await prisma.kycProfile.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.kycProfile.create({
          data: {
            userId: user.id,
            createdBy: user.id,
            ...data,
          },
        });

    await prisma.activity.create({
      data: {
        type: ActivityType.KYC_SUBMITTED,
        title: "KYC submitted",
        description: "Identity verification submitted for review",
        actorId: user.id,
        organisationId: membership.organisationId,
        entityType: "KycProfile",
        entityId: profile.id,
      },
    });

    await recomputeTrustScore(membership.organisationId, user.id);
    return ok(profile, { status: existing ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}
