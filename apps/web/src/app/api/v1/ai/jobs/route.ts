import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/http";
import {
  requireAuth,
  requireOrgMembership,
  requirePermission,
} from "@/lib/org-access";
import { Permission } from "@/lib/permissions";
import {
  analyzeDocument,
  askAssistant,
  listAiJobs,
  scoreTradeRisk,
} from "@/lib/ai";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.AI_READ);
    const membership = await requireOrgMembership(user.id);
    const jobs = await listAiJobs(membership.organisationId);
    return ok(jobs);
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
    await requirePermission(user, Permission.AI_WRITE);
    const membership = await requireOrgMembership(user.id);
    const body = await req.json();
    const action = String(body.action ?? "assistant");

    if (action === "analyze_document") {
      const documentId = String(body.documentId ?? "");
      if (!documentId) return fail("documentId is required", 400);
      const job = await analyzeDocument({
        organisationId: membership.organisationId,
        documentId,
        actorId: user.id,
      });
      return ok(job, { status: 201 });
    }

    if (action === "score_trade") {
      const tradeId = String(body.tradeId ?? "");
      if (!tradeId) return fail("tradeId is required", 400);
      const job = await scoreTradeRisk({
        organisationId: membership.organisationId,
        tradeId,
        actorId: user.id,
      });
      return ok(job, { status: 201 });
    }

    if (action === "assistant") {
      const prompt = String(body.prompt ?? "").trim();
      if (!prompt) return fail("prompt is required", 400);
      const job = await askAssistant({
        organisationId: membership.organisationId,
        actorId: user.id,
        prompt,
        tradeId: body.tradeId ? String(body.tradeId) : null,
      });
      return ok(job, { status: 201 });
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
