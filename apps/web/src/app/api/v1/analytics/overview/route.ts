import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/http";
import {
  isAdmin,
  requireAuth,
  requireOrgMembership,
  requirePermission,
} from "@/lib/org-access";
import { Permission } from "@/lib/permissions";
import {
  computeOverview,
  listSnapshots,
  persistDailySnapshot,
} from "@/lib/analytics";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.ANALYTICS_READ);
    const membership = await requireOrgMembership(user.id);

    const days = Math.min(
      90,
      Math.max(7, Number(req.nextUrl.searchParams.get("days") ?? 30) || 30),
    );
    const scopeParam = req.nextUrl.searchParams.get("scope") ?? "org";
    const orgId =
      scopeParam === "global" && isAdmin(user)
        ? null
        : membership.organisationId;

    const overview = await computeOverview({ orgId, days });
    return ok(overview);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(
      message,
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400,
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.ANALYTICS_READ);
    const membership = await requireOrgMembership(user.id);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "snapshot");

    if (action === "snapshot") {
      const scopeParam = String(body.scope ?? "org");
      const orgId =
        scopeParam === "global" && isAdmin(user)
          ? null
          : membership.organisationId;
      const overview = await persistDailySnapshot({ orgId });
      return ok(overview);
    }

    if (action === "history") {
      const days = Math.min(90, Math.max(7, Number(body.days ?? 30) || 30));
      const scopeParam = String(body.scope ?? "org");
      const scope =
        scopeParam === "global" && isAdmin(user)
          ? "global"
          : membership.organisationId;
      const snapshots = await listSnapshots({ scope, days });
      return ok(snapshots);
    }

    return fail("Unknown action", 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(
      message,
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400,
    );
  }
}
