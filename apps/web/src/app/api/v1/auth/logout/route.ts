import { NextRequest } from "next/server";
import { logout, requireUser } from "@/lib/auth-server";
import { fail, ok } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json().catch(() => ({}));
    const result = await logout(user.id, body.refreshToken);
    return ok(result);
  } catch {
    return fail("Unauthorized", 401);
  }
}
