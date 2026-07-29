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
import { createSignedDownloadUrl } from "@/lib/supabase-server";

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

    const url = await createSignedDownloadUrl(doc.storagePath, 300);
    return ok({ url, expiresIn: 300, fileName: doc.fileName });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}
