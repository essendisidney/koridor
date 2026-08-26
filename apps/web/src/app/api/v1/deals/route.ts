import { NextRequest } from "next/server";
import { DealStatus } from "@prisma/client";
import { fail, ok } from "@/lib/http";
import {
  requireAuth,
  requireOrgMembership,
  requirePermission,
} from "@/lib/org-access";
import { Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { dealReference } from "@/lib/matching";
import { decimalNumber } from "@/lib/trade";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.TRADE_READ);
    const membership = await requireOrgMembership(user.id);
    const rows = await prisma.deal.findMany({
      where: {
        deletedAt: null,
        OR: [
          { buyerOrgId: membership.organisationId },
          { sellerOrgId: membership.organisationId },
        ],
      },
      include: {
        buyerOrg: { select: { name: true, countryCode: true, slug: true } },
        sellerOrg: { select: { name: true, countryCode: true, slug: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    return ok(rows);
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

    const offerId = body.offerId ? String(body.offerId) : null;
    const offer = offerId
      ? await prisma.offer.findFirst({
          where: { id: offerId, deletedAt: null },
          include: { rfq: true },
        })
      : null;
    if (offerId && !offer) return fail("Offer not found", 404);
    if (offer) {
      if (
        offer.rfq.buyerOrgId !== membership.organisationId &&
        offer.sellerOrgId !== membership.organisationId
      ) {
        return fail("Forbidden", 403);
      }
    }

    const sellerOrgId = offer
      ? offer.sellerOrgId
      : String(body.sellerOrgId ?? "");
    const buyerOrgId = offer
      ? offer.rfq.buyerOrgId
      : membership.organisationId;
    const commodity = offer
      ? offer.rfq.commodity
      : String(body.commodity ?? "").trim();
    const quantity = offer
      ? Number(offer.quantity)
      : decimalNumber(body.quantity);
    if (!sellerOrgId || !commodity || quantity <= 0) {
      return fail("sellerOrgId, commodity and quantity required", 400);
    }

    const count = await prisma.deal.count();
    const value = offer
      ? Number(offer.unitPrice) * Number(offer.quantity)
      : body.value
        ? decimalNumber(body.value)
        : null;

    const deal = await prisma.deal.create({
      data: {
        reference: dealReference(count + 1),
        requirementId: offer?.rfq.requirementId ?? body.requirementId ?? null,
        rfqId: offer?.rfqId ?? body.rfqId ?? null,
        offerId: offer?.id ?? null,
        buyerOrgId,
        sellerOrgId,
        title: String(body.title ?? `${commodity} deal`),
        commodity,
        quantity,
        unit: offer?.unit ?? String(body.unit ?? "MT"),
        value,
        currency: offer?.currency ?? String(body.currency ?? "USD"),
        status: DealStatus.PENDING_CONTRACT,
        createdBy: user.id,
      },
    });

    await prisma.dealMessage.create({
      data: {
        dealId: deal.id,
        authorUserId: user.id,
        body: "Deal room opened. Negotiate terms, then attach contract and Trade Passport.",
      },
    });

    return ok(deal, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}
