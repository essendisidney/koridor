import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/http";
import {
  requireAuth,
  requireOrgMembership,
  requirePermission,
} from "@/lib/org-access";
import { Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { buildDealTimeline } from "@/lib/deal-room";

export const runtime = "nodejs";

async function assertDealAccess(dealId: string, orgId: string) {
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, deletedAt: null },
    include: {
      buyerOrg: {
        select: {
          id: true,
          name: true,
          countryCode: true,
          slug: true,
          city: true,
          verificationStatus: true,
          trustProfile: { select: { trustScore: true } },
        },
      },
      sellerOrg: {
        select: {
          id: true,
          name: true,
          countryCode: true,
          slug: true,
          city: true,
          verificationStatus: true,
          trustProfile: { select: { trustScore: true } },
        },
      },
      messages: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        take: 200,
      },
      requirement: {
        select: {
          id: true,
          reference: true,
          status: true,
          commodity: true,
          quantity: true,
          unit: true,
          destinationCountry: true,
          destinationCity: true,
          destinationPort: true,
          deliveryStart: true,
          deliveryEnd: true,
          incoterm: true,
          paymentTerms: true,
          currency: true,
          grade: true,
          certifications: true,
          matchedQuantity: true,
          verifiedDemand: true,
        },
      },
      rfq: {
        select: {
          id: true,
          reference: true,
          status: true,
          commodity: true,
          quantity: true,
          unit: true,
          targetPrice: true,
          currency: true,
          originCountry: true,
          destinationCountry: true,
          incoterm: true,
          neededBy: true,
        },
      },
      offer: {
        select: {
          id: true,
          status: true,
          unitPrice: true,
          quantity: true,
          unit: true,
          currency: true,
          incoterm: true,
          leadTimeDays: true,
          validUntil: true,
          notes: true,
          currentVersion: true,
        },
      },
      contract: {
        select: {
          id: true,
          reference: true,
          status: true,
          title: true,
          unitPrice: true,
          totalValue: true,
          currency: true,
          incoterm: true,
          quantity: true,
          unit: true,
        },
      },
      trade: {
        select: {
          id: true,
          tradeNumber: true,
          status: true,
          currentStage: true,
          completionPct: true,
          trustScore: true,
          riskScore: true,
          originCountry: true,
          destinationCountry: true,
          incoterms: true,
        },
      },
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

    const orgIds = [deal.buyerOrgId, deal.sellerOrgId];
    const [documents, shipments] = await Promise.all([
      prisma.document.findMany({
        where: {
          deletedAt: null,
          organisationId: { in: orgIds },
        },
        select: {
          id: true,
          type: true,
          status: true,
          fileName: true,
          organisationId: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      deal.contractId
        ? prisma.shipment.findMany({
            where: {
              deletedAt: null,
              contractId: deal.contractId,
            },
            select: {
              id: true,
              reference: true,
              status: true,
              carrierName: true,
              trackingNumber: true,
              origin: true,
              destination: true,
              bookedAt: true,
              departedAt: true,
              deliveredAt: true,
            },
            take: 10,
          })
        : Promise.resolve([]),
    ]);

    const timeline = buildDealTimeline({
      status: deal.status,
      requirementId: deal.requirementId,
      requirement: deal.requirement,
      matchedQuantity: deal.requirement
        ? Number(deal.requirement.matchedQuantity)
        : null,
      quantity: Number(deal.quantity),
      rfq: deal.rfq,
      offer: deal.offer
        ? {
            id: deal.offer.id,
            status: deal.offer.status,
            unitPrice: Number(deal.offer.unitPrice),
          }
        : null,
      contract: deal.contract,
      trade: deal.trade,
      hasMessages: deal.messages.length > 0,
      hasDocuments: documents.length > 0,
      hasShipment: shipments.length > 0,
    });

    return ok({
      ...deal,
      documents,
      shipments,
      timeline,
      role:
        deal.buyerOrgId === membership.organisationId ? "BUYER" : "SUPPLIER",
    });
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
        data: {
          dealId: id,
          authorUserId: user.id,
          body: text,
          kind: "MESSAGE",
        },
      });
      return ok(msg, { status: 201 });
    }

    if (action === "term_change") {
      const field = String(body.field ?? "").toUpperCase().trim();
      const fromValue = String(body.fromValue ?? "").trim();
      const toValue = String(body.toValue ?? "").trim();
      if (!field || !toValue) {
        return fail("field and toValue required", 400);
      }
      const label = field.replaceAll("_", " ");
      const summary = fromValue
        ? `${label}: ${fromValue} → ${toValue}`
        : `${label}: ${toValue}`;
      const msg = await prisma.dealMessage.create({
        data: {
          dealId: id,
          authorUserId: user.id,
          body: summary,
          kind: "TERM_CHANGE",
          field,
          fromValue: fromValue || null,
          toValue,
        },
      });

      // Apply known commercial fields onto the deal when appropriate
      if (field === "QUANTITY") {
        const qty = Number(toValue);
        if (Number.isFinite(qty) && qty > 0) {
          await prisma.deal.update({
            where: { id },
            data: { quantity: qty, updatedBy: user.id },
          });
        }
      }
      if (field === "PRICE" && deal.value != null) {
        const price = Number(toValue);
        if (Number.isFinite(price) && price > 0) {
          await prisma.deal.update({
            where: { id },
            data: {
              value: price * Number(deal.quantity),
              updatedBy: user.id,
            },
          });
        }
      }

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
