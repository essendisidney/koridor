import { NextRequest } from "next/server";
import { ActivityType, DocumentType } from "@prisma/client";
import { fail, ok } from "@/lib/http";
import {
  requireAuth,
  requireOrgMembership,
  requirePermission,
} from "@/lib/org-access";
import { Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  documentStoragePath,
  uploadObject,
} from "@/lib/supabase-server";
import { recomputeTrustScore } from "@/lib/trust-score";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set(Object.values(DocumentType));

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.DOCUMENTS_READ);
    const membership = await requireOrgMembership(user.id);
    const docs = await prisma.document.findMany({
      where: { organisationId: membership.organisationId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return ok(docs);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.DOCUMENTS_WRITE);
    const membership = await requireOrgMembership(user.id);

    const form = await req.formData();
    const file = form.get("file");
    const typeRaw = String(form.get("type") ?? "OTHER");
    const notes = String(form.get("notes") ?? "") || undefined;
    const verificationCaseId =
      String(form.get("verificationCaseId") ?? "") || undefined;

    if (!(file instanceof File)) {
      return fail("file is required", 400);
    }
    if (!ALLOWED_TYPES.has(typeRaw as DocumentType)) {
      return fail("Invalid document type", 400);
    }
    if (file.size > 10 * 1024 * 1024) {
      return fail("File must be 10MB or smaller", 400);
    }

    const doc = await prisma.document.create({
      data: {
        organisationId: membership.organisationId,
        uploadedById: user.id,
        verificationCaseId,
        type: typeRaw as DocumentType,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        storagePath: "pending",
        notes,
        createdBy: user.id,
        updatedBy: user.id,
      },
    });

    const storagePath = documentStoragePath(
      membership.organisationId,
      doc.id,
      file.name,
    );
    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadObject(storagePath, buffer, file.type || "application/octet-stream");

    const updated = await prisma.document.update({
      where: { id: doc.id },
      data: { storagePath },
    });

    await prisma.activity.create({
      data: {
        type: ActivityType.DOCUMENT_UPLOADED,
        title: "Document uploaded",
        description: `${file.name} (${typeRaw})`,
        actorId: user.id,
        organisationId: membership.organisationId,
        entityType: "Document",
        entityId: doc.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "DOCUMENT_UPLOADED",
        entityType: "Document",
        entityId: doc.id,
        actorId: user.id,
        organisationId: membership.organisationId,
        after: { type: typeRaw, fileName: file.name },
      },
    });

    await recomputeTrustScore(membership.organisationId, user.id);
    return ok(updated, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}
