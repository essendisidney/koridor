import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/http";
import { isAdmin, requireAuth, requirePermission } from "@/lib/org-access";
import { Permission } from "@/lib/permissions";
import {
  adminOverview,
  listFeatureFlags,
  recentHealthLogs,
  runHealthChecks,
  upsertFeatureFlag,
} from "@/lib/admin";
import {
  controlTowerPipeline,
  listControlExceptions,
} from "@/lib/control-tower";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (!isAdmin(user) && !user.roles.includes("SYSTEM_ADMIN")) {
      await requirePermission(user, Permission.ADMIN_ALL);
    }
    const view = req.nextUrl.searchParams.get("view") ?? "overview";
    if (view === "flags") return ok(await listFeatureFlags());
    if (view === "health") return ok(await runHealthChecks(user.id));
    if (view === "health_logs") return ok(await recentHealthLogs());
    if (view === "exceptions") return ok(await listControlExceptions());
    if (view === "tower") return ok(await controlTowerPipeline());
    return ok(await adminOverview());
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
    if (!isAdmin(user) && !user.roles.includes("SYSTEM_ADMIN")) {
      await requirePermission(user, Permission.ADMIN_ALL);
    }
    const body = await req.json();
    const action = String(body.action ?? "upsert_flag");

    if (action === "upsert_flag") {
      const flag = await upsertFeatureFlag({
        key: String(body.key ?? ""),
        name: body.name ? String(body.name) : undefined,
        description:
          body.description !== undefined ? String(body.description) : undefined,
        enabled: Boolean(body.enabled),
        percentage:
          body.percentage !== undefined ? Number(body.percentage) : undefined,
        actorId: user.id,
      });
      return ok(flag);
    }

    if (action === "health_check") {
      return ok(await runHealthChecks(user.id));
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
