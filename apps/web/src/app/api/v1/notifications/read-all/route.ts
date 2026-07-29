import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { fail, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const result = await prisma.notification.updateMany({
      where: { userId: user.id, status: "UNREAD", deletedAt: null },
      data: { status: "READ", readAt: new Date(), updatedBy: user.id },
    });
    return ok({ updated: result.count });
  } catch {
    return fail("Unauthorized", 401);
  }
}
