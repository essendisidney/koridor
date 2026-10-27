import { fail, ok } from "@/lib/http";
import { requestPasswordReset } from "@/lib/password-reset";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim();
    if (!email) return fail("Enter your email", 400);
    await requestPasswordReset(email);
    // Same answer whether or not the account exists.
    return ok({ sent: true });
  } catch (error) {
    console.error("[auth/forgot]", error);
    return ok({ sent: true });
  }
}
