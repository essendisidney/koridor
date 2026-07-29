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

type Ctx = { params: Promise<{ id: string; contactId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.ORG_WRITE);
    const { id, contactId } = await ctx.params;
    const membership = await requireOrgMembership(user.id);
    if (membership.organisationId !== id) return fail("Forbidden", 403);

    const existing = await prisma.orgContact.findFirst({
      where: { id: contactId, organisationId: id, deletedAt: null },
    });
    if (!existing) return fail("Contact not found", 404);

    const body = await req.json();
    if (body.isPrimary) {
      await prisma.orgContact.updateMany({
        where: { organisationId: id, deletedAt: null },
        data: { isPrimary: false },
      });
    }

    const contact = await prisma.orgContact.update({
      where: { id: contactId },
      data: {
        name: body.name !== undefined ? String(body.name).trim() : undefined,
        email:
          body.email !== undefined
            ? String(body.email).trim() || null
            : undefined,
        phone:
          body.phone !== undefined
            ? String(body.phone).trim() || null
            : undefined,
        title:
          body.title !== undefined
            ? String(body.title).trim() || null
            : undefined,
        isPrimary:
          body.isPrimary !== undefined ? Boolean(body.isPrimary) : undefined,
        updatedBy: user.id,
      },
    });

    await recomputeTrustScore(id, user.id);
    return ok(contact);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.ORG_WRITE);
    const { id, contactId } = await ctx.params;
    const membership = await requireOrgMembership(user.id);
    if (membership.organisationId !== id) return fail("Forbidden", 403);

    const existing = await prisma.orgContact.findFirst({
      where: { id: contactId, organisationId: id, deletedAt: null },
    });
    if (!existing) return fail("Contact not found", 404);

    await prisma.orgContact.update({
      where: { id: contactId },
      data: { deletedAt: new Date(), updatedBy: user.id },
    });

    await recomputeTrustScore(id, user.id);
    return ok({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}
