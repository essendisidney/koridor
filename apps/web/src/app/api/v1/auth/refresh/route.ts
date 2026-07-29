import { refresh } from "@/lib/auth-server";
import { fail, ok } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await refresh(String(body.refreshToken ?? ""));
    return ok(result);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Refresh failed", 401);
  }
}
