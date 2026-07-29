import { NextRequest } from "next/server";
import {
  ActivityType,
  ContractStatus,
  MilestoneStatus,
  OfferStatus,
  RfqStatus,
} from "@prisma/client";
import { Prisma } from "@prisma/client";
import { fail, ok } from "@/lib/http";
import {
  requireAuth,
  requireOrgMembership,
  requirePermission,
} from "@/lib/org-access";
import { Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { decimalNumber, recordTradeEvent, tradeReference } from "@/lib/trade";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.TRADE_READ);
    const membership = await requireOrgMembership(user.id);
    const { id: rfqId } = await ctx.params;

    const rfq = await prisma.rfq.findFirst({ where: { id: rfqId, deletedAt: null } });
    if (!rfq) return fail("RFQ not found", 404);

    const isBuyer = rfq.buyerOrgId === membership.organisationId;
    const offers = await prisma.offer.findMany({
      where: {
        rfqId,
        deletedAt: null,
        ...(isBuyer ? {} : { sellerOrgId: membership.organisationId }),
      },
      include: {
        sellerOrg: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return ok(offers);
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
    const { id: rfqId } = await ctx.params;
    const body = await req.json();

    const rfq = await prisma.rfq.findFirst({
      where: { id: rfqId, deletedAt: null },
    });
    if (!rfq) return fail("RFQ not found", 404);
    if (rfq.status !== RfqStatus.OPEN) return fail("RFQ is not open for offers", 409);
    if (rfq.buyerOrgId === membership.organisationId) {
      return fail("Buyers cannot offer on their own RFQ", 400);
    }

    const existing = await prisma.offer.findFirst({
      where: {
        rfqId,
        sellerOrgId: membership.organisationId,
        deletedAt: null,
        status: OfferStatus.PENDING,
      },
    });
    if (existing) return fail("You already have a pending offer on this RFQ", 409);

    const unitPrice = decimalNumber(body.unitPrice);
    const quantity = decimalNumber(body.quantity, Number(rfq.quantity));
    if (unitPrice <= 0 || quantity <= 0) {
      return fail("unitPrice and quantity must be positive", 400);
    }

    const offer = await prisma.offer.create({
      data: {
        rfqId,
        sellerOrgId: membership.organisationId,
        createdById: user.id,
        unitPrice,
        currency: String(body.currency ?? rfq.currency).slice(0, 3).toUpperCase(),
        quantity,
        unit: String(body.unit ?? rfq.unit),
        incoterm: body.incoterm ? String(body.incoterm) : rfq.incoterm,
        leadTimeDays:
          body.leadTimeDays !== undefined && body.leadTimeDays !== ""
            ? Number(body.leadTimeDays)
            : null,
        validUntil: body.validUntil ? new Date(String(body.validUntil)) : null,
        notes: body.notes ? String(body.notes) : null,
        createdBy: user.id,
        updatedBy: user.id,
      },
      include: {
        sellerOrg: { select: { id: true, name: true, slug: true } },
      },
    });

    await recordTradeEvent({
      type: "OFFER_SUBMITTED",
      message: `Offer ${unitPrice} ${offer.currency}/${offer.unit}`,
      actorId: user.id,
      rfqId,
    });

    await prisma.activity.create({
      data: {
        type: ActivityType.OFFER_SUBMITTED,
        title: "Offer submitted",
        description: rfq.title,
        actorId: user.id,
        organisationId: membership.organisationId,
        entityType: "Offer",
        entityId: offer.id,
      },
    });

    await prisma.notification.create({
      data: {
        userId: rfq.createdById,
        title: "New offer received",
        body: `${membership.organisation.name} offered on ${rfq.title}`,
        link: `/dashboard/rfqs/${rfq.id}`,
      },
    });

    return ok(offer, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}

/** Accept / reject offer — nested under /rfqs/[id]/offers via separate route file */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.TRADE_WRITE);
    const membership = await requireOrgMembership(user.id);
    const { id: rfqId } = await ctx.params;
    const body = await req.json();
    const offerId = String(body.offerId ?? "");
    const decision = String(body.decision ?? "").toUpperCase();

    if (!offerId || (decision !== "ACCEPTED" && decision !== "REJECTED")) {
      return fail("offerId and decision (ACCEPTED|REJECTED) required", 400);
    }

    const rfq = await prisma.rfq.findFirst({
      where: { id: rfqId, deletedAt: null, buyerOrgId: membership.organisationId },
    });
    if (!rfq) return fail("RFQ not found or not owned by your organisation", 404);

    const offer = await prisma.offer.findFirst({
      where: { id: offerId, rfqId, deletedAt: null, status: OfferStatus.PENDING },
      include: { sellerOrg: true },
    });
    if (!offer) return fail("Pending offer not found", 404);

    if (decision === "REJECTED") {
      const updated = await prisma.offer.update({
        where: { id: offerId },
        data: { status: OfferStatus.REJECTED, updatedBy: user.id },
      });
      await recordTradeEvent({
        type: "OFFER_REJECTED",
        message: "Offer rejected",
        actorId: user.id,
        rfqId,
      });
      await prisma.activity.create({
        data: {
          type: ActivityType.OFFER_REJECTED,
          title: "Offer rejected",
          actorId: user.id,
          organisationId: membership.organisationId,
          entityType: "Offer",
          entityId: offerId,
        },
      });
      return ok(updated);
    }

    const totalValue = new Prisma.Decimal(offer.unitPrice).mul(offer.quantity);

    const result = await prisma.$transaction(async (tx) => {
      await tx.offer.update({
        where: { id: offerId },
        data: { status: OfferStatus.ACCEPTED, updatedBy: user.id },
      });
      await tx.offer.updateMany({
        where: {
          rfqId,
          id: { not: offerId },
          status: OfferStatus.PENDING,
          deletedAt: null,
        },
        data: { status: OfferStatus.REJECTED, updatedBy: user.id },
      });
      await tx.rfq.update({
        where: { id: rfqId },
        data: {
          status: RfqStatus.AWARDED,
          closedAt: new Date(),
          updatedBy: user.id,
        },
      });

      const contract = await tx.contract.create({
        data: {
          reference: tradeReference("CTR"),
          rfqId,
          offerId,
          buyerOrgId: rfq.buyerOrgId,
          sellerOrgId: offer.sellerOrgId,
          title: rfq.title,
          commodity: rfq.commodity,
          quantity: offer.quantity,
          unit: offer.unit,
          unitPrice: offer.unitPrice,
          currency: offer.currency,
          totalValue,
          incoterm: offer.incoterm ?? rfq.incoterm,
          status: ContractStatus.PENDING_SIGNATURES,
          terms: `Contract formed from ${rfq.reference} / offer acceptance.`,
          createdBy: user.id,
          updatedBy: user.id,
          milestones: {
            create: [
              {
                title: "Contract signed",
                sequence: 1,
                status: MilestoneStatus.PENDING,
                createdBy: user.id,
              },
              {
                title: "Goods ready for shipment",
                sequence: 2,
                status: MilestoneStatus.PENDING,
                createdBy: user.id,
              },
              {
                title: "Delivery completed",
                sequence: 3,
                status: MilestoneStatus.PENDING,
                createdBy: user.id,
              },
            ],
          },
        },
        include: { milestones: true },
      });

      return contract;
    });

    await recordTradeEvent({
      type: "OFFER_ACCEPTED",
      message: "Offer accepted — contract created",
      actorId: user.id,
      rfqId,
      contractId: result.id,
    });
    await recordTradeEvent({
      type: "CONTRACT_CREATED",
      message: result.reference,
      actorId: user.id,
      rfqId,
      contractId: result.id,
    });

    await prisma.activity.create({
      data: {
        type: ActivityType.CONTRACT_CREATED,
        title: "Contract created",
        description: result.reference,
        actorId: user.id,
        organisationId: membership.organisationId,
        entityType: "Contract",
        entityId: result.id,
      },
    });

    return ok(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}
