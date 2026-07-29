import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { fail, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(req);
    const { id } = await params;
    const membership = await prisma.organisationMember.findFirst({
      where: { organisationId: id, userId: user.id, deletedAt: null },
    });
    if (!membership) return fail("Forbidden", 403);

    const members = await prisma.organisationMember.findMany({
      where: { organisationId: id, deletedAt: null },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            roles: { where: { deletedAt: null }, select: { role: true } },
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });
    return ok(members);
  } catch {
    return fail("Unauthorized", 401);
  }
}
