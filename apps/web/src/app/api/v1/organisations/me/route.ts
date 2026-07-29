import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { fail, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const membership = await prisma.organisationMember.findFirst({
      where: { userId: user.id, deletedAt: null },
      include: { organisation: true },
      orderBy: { joinedAt: "asc" },
    });
    if (!membership || membership.organisation.deletedAt) {
      return fail("No organisation linked to this account", 404);
    }
    return ok(membership.organisation);
  } catch {
    return fail("Unauthorized", 401);
  }
}
