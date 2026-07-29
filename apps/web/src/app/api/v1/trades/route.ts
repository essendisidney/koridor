import { NextRequest } from "next/server";
import { TradeStatus } from "@prisma/client";
import { fail, ok } from "@/lib/http";
import {
  requireAuth,
  requireOrgMembership,
  requirePermission,
} from "@/lib/org-access";
import { Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createTradePassport } from "@/lib/trade-passport";
import { decimalNumber } from "@/lib/trade";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.TRADE_READ);
    const membership = await requireOrgMembership(user.id);
    const status = req.nextUrl.searchParams.get("status") ?? undefined;

    const trades = await prisma.trade.findMany({
      where: {
        deletedAt: null,
        OR: [
          { buyerOrgId: membership.organisationId },
          { sellerOrgId: membership.organisationId },
          {
            participants: {
              some: {
                organisationId: membership.organisationId,
                deletedAt: null,
              },
            },
          },
        ],
        ...(status ? { status: status as TradeStatus } : {}),
      },
      include: {
        buyerOrg: { select: { id: true, name: true, slug: true } },
        sellerOrg: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    return ok(trades);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.TRADE_WRITE);
    const membership = await requireOrgMembership(user.id);
    const body = await req.json();

    const title = String(body.title ?? "").trim();
    const commodity = String(body.commodity ?? "").trim();
    if (!title) return fail("title is required", 400);
    if (!commodity) return fail("commodity is required", 400);

    const quantity = decimalNumber(body.quantity, 0);
    if (quantity <= 0) return fail("quantity must be positive", 400);

    const trade = await createTradePassport({
      buyerOrgId: membership.organisationId,
      sellerOrgId: body.sellerOrgId ? String(body.sellerOrgId) : null,
      ownerId: user.id,
      actorId: user.id,
      title,
      commodity,
      quantity,
      unit: body.unit ? String(body.unit) : "MT",
      value: body.value !== undefined ? decimalNumber(body.value) : null,
      currency: body.currency ? String(body.currency) : "USD",
      originCountry: body.originCountry ? String(body.originCountry) : null,
      destinationCountry: body.destinationCountry
        ? String(body.destinationCountry)
        : null,
      corridor: body.corridor ? String(body.corridor) : null,
      incoterms: body.incoterms ? String(body.incoterms) : null,
      status: TradeStatus.DRAFT,
      notes: body.notes ? String(body.notes) : null,
    });

    return ok(trade, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}
