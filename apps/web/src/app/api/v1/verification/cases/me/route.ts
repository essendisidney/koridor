import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/http";
import {
  requireAuth,
  requireOrgMembership,
  requirePermission,
} from "@/lib/org-access";
import { Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.TRUST_READ);
    const membership = await requireOrgMembership(user.id);

    const cases = await prisma.verificationCase.findMany({
      where: {
        organisationId: membership.organisationId,
        deletedAt: null,
      },
      include: {
        documents: { where: { deletedAt: null } },
        events: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return ok(cases);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}
