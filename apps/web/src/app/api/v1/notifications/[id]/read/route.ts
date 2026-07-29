import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { fail, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(req);
    const { id } = await params;
    const notification = await prisma.notification.findFirst({
      where: { id, userId: user.id, deletedAt: null },
    });
    if (!notification) return fail("Not found", 404);
    const updated = await prisma.notification.update({
      where: { id },
      data: { status: "READ", readAt: new Date(), updatedBy: user.id },
    });
    return ok(updated);
  } catch {
    return fail("Unauthorized", 401);
  }
}
