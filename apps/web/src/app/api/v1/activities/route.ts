import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { fail, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const limit = Number(req.nextUrl.searchParams.get("limit") ?? 20);
    const memberships = await prisma.organisationMember.findMany({
      where: { userId: user.id, deletedAt: null },
      select: { organisationId: true },
    });
    const orgIds = memberships.map((m) => m.organisationId);
    const data = await prisma.activity.findMany({
      where: {
        deletedAt: null,
        OR: [
          { actorId: user.id },
          ...(orgIds.length ? [{ organisationId: { in: orgIds } }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 100),
    });
    return ok(data);
  } catch {
    return fail("Unauthorized", 401);
  }
}
