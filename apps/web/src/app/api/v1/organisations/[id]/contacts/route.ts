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

type Ctx = { params: Promise<{ id: string }> };

async function assertOrgAccess(userId: string, organisationId: string) {
  const membership = await requireOrgMembership(userId);
  if (membership.organisationId !== organisationId) {
    throw new Error("Forbidden");
  }
  return membership;
}

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.ORG_READ);
    const { id } = await ctx.params;
    await assertOrgAccess(user.id, id);

    const contacts = await prisma.orgContact.findMany({
      where: { organisationId: id, deletedAt: null },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    });
    return ok(contacts);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(
      message,
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400,
    );
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.ORG_WRITE);
    const { id } = await ctx.params;
    await assertOrgAccess(user.id, id);
    const body = await req.json();

    if (body.isPrimary) {
      await prisma.orgContact.updateMany({
        where: { organisationId: id, deletedAt: null },
        data: { isPrimary: false },
      });
    }

    const contact = await prisma.orgContact.create({
      data: {
        organisationId: id,
        name: String(body.name ?? "").trim(),
        email: body.email ? String(body.email).trim() : null,
        phone: body.phone ? String(body.phone).trim() : null,
        title: body.title ? String(body.title).trim() : null,
        isPrimary: Boolean(body.isPrimary),
        createdBy: user.id,
        updatedBy: user.id,
      },
    });

    await recomputeTrustScore(id, user.id);
    return ok(contact, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(
      message,
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400,
    );
  }
}
