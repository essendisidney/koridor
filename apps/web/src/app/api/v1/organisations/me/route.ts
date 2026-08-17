import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { getMembership } from "@/lib/org-access";
import { fail, ok } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const membership = await getMembership(user.id);
    if (!membership || membership.organisation.deletedAt) {
      return fail("No organisation linked to this account", 404);
    }
    return ok(membership.organisation);
  } catch {
    return fail("Unauthorized", 401);
  }
}
