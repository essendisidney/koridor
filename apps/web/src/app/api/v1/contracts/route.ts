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
    await requirePermission(user, Permission.TRADE_READ);
    const membership = await requireOrgMembership(user.id);
    const status = req.nextUrl.searchParams.get("status") ?? undefined;

    const contracts = await prisma.contract.findMany({
      where: {
        deletedAt: null,
        OR: [
          { buyerOrgId: membership.organisationId },
          { sellerOrgId: membership.organisationId },
        ],
        ...(status ? { status: status as never } : {}),
      },
      include: {
        buyerOrg: { select: { id: true, name: true, slug: true } },
        sellerOrg: { select: { id: true, name: true, slug: true } },
        _count: { select: { milestones: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return ok(contracts);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}
