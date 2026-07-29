import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/http";
import {
  isAdmin,
  requireAuth,
  requireOrgMembership,
  requirePermission,
} from "@/lib/org-access";
import { Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { removeObject } from "@/lib/supabase-server";
import { recomputeTrustScore } from "@/lib/trust-score";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.DOCUMENTS_READ);
    const { id } = await ctx.params;
    const doc = await prisma.document.findFirst({
      where: { id, deletedAt: null },
    });
    if (!doc) return fail("Document not found", 404);

    if (!isAdmin(user)) {
      const membership = await requireOrgMembership(user.id);
      if (doc.organisationId !== membership.organisationId) {
        return fail("Forbidden", 403);
      }
    }
    return ok(doc);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.DOCUMENTS_WRITE);
    const membership = await requireOrgMembership(user.id);
    const { id } = await ctx.params;
    const doc = await prisma.document.findFirst({
      where: {
        id,
        organisationId: membership.organisationId,
        deletedAt: null,
      },
    });
    if (!doc) return fail("Document not found", 404);

    await prisma.document.update({
      where: { id: doc.id },
      data: { deletedAt: new Date(), updatedBy: user.id },
    });

    try {
      if (doc.storagePath !== "pending") await removeObject(doc.storagePath);
    } catch {
      // Soft-delete still succeeds if storage cleanup fails.
    }

    await recomputeTrustScore(membership.organisationId, user.id);
    return ok({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}
