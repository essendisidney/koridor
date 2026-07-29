import { register } from "@/lib/auth-server";
import { fail, ok } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.email || !body.password || !body.firstName || !body.lastName) {
      return fail("Missing required fields", 400);
    }
    if (String(body.password).length < 8) {
      return fail("Password must be at least 8 characters", 400);
    }
    const result = await register({
      email: String(body.email),
      password: String(body.password),
      firstName: String(body.firstName),
      lastName: String(body.lastName),
      phone: body.phone ? String(body.phone) : undefined,
      role: body.role ? String(body.role) : undefined,
    });
    return ok(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Register failed";
    return fail(message, message.includes("already") ? 409 : 400);
  }
}
