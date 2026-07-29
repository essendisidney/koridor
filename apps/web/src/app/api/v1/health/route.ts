import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return ok({
      status: "ok",
      timestamp: new Date().toISOString(),
      checks: { database: "up" },
    });
  } catch {
    return fail("Database unavailable", 503, "SERVICE_UNAVAILABLE");
  }
}
