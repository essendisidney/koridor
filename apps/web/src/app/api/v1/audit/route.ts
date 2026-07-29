import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { fail, ok } from "@/lib/http";
import { hasPermission, Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!hasPermission(user.permissions, Permission.AUDIT_READ)) {
      return fail("Insufficient permissions", 403);
    }
    const limit = Number(req.nextUrl.searchParams.get("limit") ?? 50);
    const data = await prisma.auditLog.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 100),
    });
    return ok(data);
  } catch {
    return fail("Unauthorized", 401);
  }
}
