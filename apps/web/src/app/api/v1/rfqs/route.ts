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
import { decimalNumber, recordTradeEvent, tradeReference } from "@/lib/trade";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await requirePermission(user, Permission.TRADE_READ);
    const membership = await requireOrgMembership(user.id);
    const scope = req.nextUrl.searchParams.get("scope") ?? "mine";
    const status = req.nextUrl.searchParams.get("status") ?? undefined;

    const listWhere =
      scope === "open"
        ? {
            deletedAt: null,
            status: RfqStatus.OPEN,
            buyerOrgId: { not: membership.organisationId },
          }
        : {
            deletedAt: null,
            buyerOrgId: membership.organisationId,
            ...(status ? { status: status as RfqStatus } : {}),
          };

    const rfqs = await prisma.rfq.findMany({
      where: listWhere,
      include: {
        buyerOrg: {
          select: { id: true, name: true, slug: true, countryCode: true },
        },
        _count: { select: { offers: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return ok(rfqs);
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
    const quantity = decimalNumber(body.quantity);
    if (!title || !commodity || quantity <= 0) {
      return fail("title, commodity and quantity are required", 400);
    }

    const publish = Boolean(body.publish);
    const rfq = await prisma.rfq.create({
      data: {
        reference: tradeReference("RFQ"),
        buyerOrgId: membership.organisationId,
        createdById: user.id,
        title,
        commodity,
        quantity,
        unit: String(body.unit ?? "MT"),
        targetPrice:
          body.targetPrice !== undefined && body.targetPrice !== ""
            ? decimalNumber(body.targetPrice)
            : null,
        currency: String(body.currency ?? "USD").slice(0, 3).toUpperCase(),
        originCountry: body.originCountry
          ? String(body.originCountry).toUpperCase().slice(0, 2)
          : null,
        destinationCountry: body.destinationCountry
          ? String(body.destinationCountry).toUpperCase().slice(0, 2)
          : null,
        incoterm: body.incoterm ? String(body.incoterm) : null,
        neededBy: body.neededBy ? new Date(String(body.neededBy)) : null,
        notes: body.notes ? String(body.notes) : null,
        status: publish ? RfqStatus.OPEN : RfqStatus.DRAFT,
        publishedAt: publish ? new Date() : null,
        createdBy: user.id,
        updatedBy: user.id,
      },
    });

    await recordTradeEvent({
      type: publish ? "RFQ_PUBLISHED" : "RFQ_CREATED",
      message: publish ? "RFQ published" : "RFQ drafted",
      actorId: user.id,
      rfqId: rfq.id,
    });

    await prisma.activity.create({
      data: {
        type: publish ? ActivityType.RFQ_PUBLISHED : ActivityType.RFQ_CREATED,
        title: publish ? "RFQ published" : "RFQ created",
        description: rfq.title,
        actorId: user.id,
        organisationId: membership.organisationId,
        entityType: "Rfq",
        entityId: rfq.id,
      },
    });

    return ok(rfq, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}
