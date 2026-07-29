import { NextRequest } from "next/server";
import { ActivityType, RfqStatus } from "@prisma/client";
import { fail, ok } from "@/lib/http";
import {
  requireAuth,
  requireOrgMembership,
  requirePermission,
} from "@/lib/org-access";
import { Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { recordTradeEvent } from "@/lib/trade";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.TRADE_READ);
    const membership = await requireOrgMembership(user.id);
    const { id } = await ctx.params;

    const rfq = await prisma.rfq.findFirst({
      where: { id, deletedAt: null },
      include: {
        buyerOrg: { select: { id: true, name: true, slug: true, countryCode: true } },
        offers: {
          where: { deletedAt: null },
          include: {
            sellerOrg: { select: { id: true, name: true, slug: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        events: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
      },
    });
    if (!rfq) return fail("RFQ not found", 404);

    const isBuyer = rfq.buyerOrgId === membership.organisationId;
    const isOpen = rfq.status === RfqStatus.OPEN;
    if (!isBuyer && !isOpen) return fail("Forbidden", 403);

    // Sellers only see their own offers on open RFQs; buyer sees all
    if (!isBuyer) {
      rfq.offers = rfq.offers.filter(
        (o) => o.sellerOrgId === membership.organisationId,
      );
    }

    return ok(rfq);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.TRADE_WRITE);
    const membership = await requireOrgMembership(user.id);
    const { id } = await ctx.params;
    const body = await req.json();
    const action = String(body.action ?? "").toLowerCase();

    const rfq = await prisma.rfq.findFirst({
      where: { id, deletedAt: null, buyerOrgId: membership.organisationId },
    });
    if (!rfq) return fail("RFQ not found", 404);

    if (action === "publish") {
      if (rfq.status !== RfqStatus.DRAFT) {
        return fail("Only draft RFQs can be published", 409);
      }
      const updated = await prisma.rfq.update({
        where: { id },
        data: {
          status: RfqStatus.OPEN,
          publishedAt: new Date(),
          updatedBy: user.id,
        },
      });
      await recordTradeEvent({
        type: "RFQ_PUBLISHED",
        message: "RFQ published",
        actorId: user.id,
        rfqId: id,
      });
      await prisma.activity.create({
        data: {
          type: ActivityType.RFQ_PUBLISHED,
          title: "RFQ published",
          description: rfq.title,
          actorId: user.id,
          organisationId: membership.organisationId,
          entityType: "Rfq",
          entityId: id,
        },
      });
      return ok(updated);
    }

    if (action === "close") {
      if (rfq.status !== RfqStatus.OPEN) {
        return fail("Only open RFQs can be closed", 409);
      }
      const updated = await prisma.rfq.update({
        where: { id },
        data: {
          status: RfqStatus.CLOSED,
          closedAt: new Date(),
          updatedBy: user.id,
        },
      });
      await recordTradeEvent({
        type: "RFQ_CLOSED",
        message: "RFQ closed",
        actorId: user.id,
        rfqId: id,
      });
      return ok(updated);
    }

    return fail("action must be publish or close", 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}
