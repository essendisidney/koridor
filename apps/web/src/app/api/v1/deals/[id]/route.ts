import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/http";
import {
  requireAuth,
  requireOrgMembership,
  requirePermission,
} from "@/lib/org-access";
import { Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function assertDealAccess(dealId: string, orgId: string) {
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, deletedAt: null },
    include: {
      buyerOrg: { select: { id: true, name: true, countryCode: true, slug: true } },
      sellerOrg: { select: { id: true, name: true, countryCode: true, slug: true } },
      messages: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        take: 200,
      },
      requirement: true,
      rfq: { select: { id: true, reference: true, status: true } },
      offer: true,
      contract: { select: { id: true, reference: true, status: true } },
      trade: { select: { id: true, tradeNumber: true, status: true, currentStage: true } },
    },
  });
  if (!deal) return null;
  if (deal.buyerOrgId !== orgId && deal.sellerOrgId !== orgId) return null;
  return deal;
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const user = await requireAuth(_req);
    await requirePermission(user, Permission.TRADE_READ);
    const membership = await requireOrgMembership(user.id);
    const deal = await assertDealAccess(id, membership.organisationId);
    if (!deal) return fail("Not found", 404);
    return ok(deal);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const user = await requireAuth(req);
    await requirePermission(user, Permission.TRADE_WRITE);
    const membership = await requireOrgMembership(user.id);
    const deal = await assertDealAccess(id, membership.organisationId);
    if (!deal) return fail("Not found", 404);
    const body = await req.json();
    const action = String(body.action ?? "message");

    if (action === "message") {
      const text = String(body.body ?? "").trim();
      if (!text) return fail("Message body required", 400);
      const msg = await prisma.dealMessage.create({
        data: { dealId: id, authorUserId: user.id, body: text },
      });
      return ok(msg, { status: 201 });
    }

    if (action === "link") {
      const updated = await prisma.deal.update({
        where: { id },
        data: {
          ...(body.contractId ? { contractId: String(body.contractId) } : {}),
          ...(body.tradeId ? { tradeId: String(body.tradeId) } : {}),
          ...(body.status ? { status: body.status } : {}),
          updatedBy: user.id,
        },
      });
      return ok(updated);
    }

    return fail("Unknown action", 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}
