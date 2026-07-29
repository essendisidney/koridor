import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { fail, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const count = await prisma.notification.count({
      where: { userId: user.id, status: "UNREAD", deletedAt: null },
    });
    return ok({ count });
  } catch {
    return fail("Unauthorized", 401);
  }
}
