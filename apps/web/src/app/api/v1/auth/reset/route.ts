import { fail, ok } from "@/lib/http";
import { resetPassword } from "@/lib/password-reset";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await resetPassword(String(body.token ?? ""), String(body.password ?? ""));
    return ok({ reset: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Reset failed", 400);
  }
}
