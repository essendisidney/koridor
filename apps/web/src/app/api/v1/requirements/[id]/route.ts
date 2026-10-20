import { NextRequest } from "next/server";
import { MatchStatus, RequirementStatus, RfqStatus } from "@prisma/client";
import { fail, ok } from "@/lib/http";
import {
  requireAuth,
  requireOrgMembership,
  requirePermission,
} from "@/lib/org-access";
import { Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { aggregateMatches } from "@/lib/matching";
import { rematchRequirement } from "@/lib/match-engine";
import { decimalNumber, tradeReference } from "@/lib/trade";

export const runtime = "nodejs";

async function loadRequirement(id: string) {
  return prisma.buyerRequirement.findFirst({
    where: { id, deletedAt: null },
    include: {
      buyerOrg: {
        select: {
          id: true,
          name: true,
          countryCode: true,
          verificationStatus: true,
        },
      },
    },
  });
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const user = await requireAuth(req);
    await requirePermission(user, Permission.TRADE_READ);
    const membership = await requireOrgMembership(user.id);
    const requirement = await loadRequirement(id);
    if (!requirement) return fail("Not found", 404);
    if (requirement.buyerOrgId !== membership.organisationId) {
      const visible: RequirementStatus[] = [
        RequirementStatus.PUBLISHED,
        RequirementStatus.MATCHING,
        RequirementStatus.RFQ_OPEN,
        RequirementStatus.PARTIALLY_FILLED,
      ];
      if (!visible.includes(requirement.status)) {
        return fail("Forbidden", 403);
      }
    }

    const matches = await prisma.requirementMatch.findMany({
      where: { requirementId: id, deletedAt: null },
      include: {
        supplierOrg: {
          select: {
            id: true,
            name: true,
            slug: true,
            countryCode: true,
            city: true,
            verificationStatus: true,
            trustProfile: { select: { trustScore: true } },
          },
        },
        supplyLot: true,
      },
      orderBy: { score: "desc" },
    });

    const agg = aggregateMatches(
      matches.map((m) => ({
        supplierOrgId: m.supplierOrgId,
        supplyLotId: m.supplyLotId,
        score: m.score,
        availableQty: Number(m.availableQty),
        quantityMatched: Number(m.quantityMatched),
        reasons: (m.reasons as string[]) ?? [],
      })),
      Number(requirement.quantity),
    );

    return ok({ requirement, matches, aggregation: agg });
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
    const requirement = await loadRequirement(id);
    if (!requirement) return fail("Not found", 404);
    if (requirement.buyerOrgId !== membership.organisationId) {
      return fail("Forbidden", 403);
    }

    const body = await req.json();
    const action = String(body.action ?? "rematch");

    if (action === "rematch") {
      const result = await rematchRequirement(id);
      return ok(result);
    }

    if (action === "select") {
      const matchIds: string[] = Array.isArray(body.matchIds)
        ? body.matchIds.map(String)
        : [];
      await prisma.requirementMatch.updateMany({
        where: { requirementId: id },
        data: { selectedForRfq: false, status: MatchStatus.SUGGESTED },
      });
      if (matchIds.length) {
        await prisma.requirementMatch.updateMany({
          where: { id: { in: matchIds }, requirementId: id },
          data: { selectedForRfq: true, status: MatchStatus.SELECTED },
        });
      }
      return ok({ selected: matchIds.length });
    }

    if (action === "create_rfq") {
      const selected = await prisma.requirementMatch.findMany({
        where: { requirementId: id, selectedForRfq: true, deletedAt: null },
      });
      const picks =
        selected.length > 0
          ? selected
          : await prisma.requirementMatch.findMany({
              where: { requirementId: id, deletedAt: null },
              orderBy: { score: "desc" },
              take: 5,
            });
      if (!picks.length) return fail("No matches to RFQ", 400);

      const qty = picks.reduce(
        (s, m) => s + Number(m.quantityMatched || m.availableQty),
        0,
      );
      const rfq = await prisma.rfq.create({
        data: {
          reference: tradeReference("RFQ"),
          requirementId: id,
          buyerOrgId: requirement.buyerOrgId,
          createdById: user.id,
          title: `${requirement.commodity} — ${requirement.destinationCountry}`,
          commodity: requirement.commodity,
          quantity: decimalNumber(Math.min(qty, Number(requirement.quantity))),
          unit: requirement.unit,
          currency: requirement.currency,
          originCountry: requirement.originPreference ?? "KE",
          destinationCountry: requirement.destinationCountry,
          incoterm: requirement.incoterm,
          neededBy: requirement.deliveryStart,
          notes: [
            requirement.grade ? `Grade: ${requirement.grade}` : null,
            requirement.certifications?.length
              ? `Certs: ${requirement.certifications.join(", ")}`
              : null,
            requirement.packaging ? `Packaging: ${requirement.packaging}` : null,
            requirement.paymentTerms
              ? `Payment: ${requirement.paymentTerms}`
              : null,
            requirement.notes,
            `Matched suppliers: ${picks.length}`,
          ]
            .filter(Boolean)
            .join("\n"),
          status: RfqStatus.OPEN,
          publishedAt: new Date(),
          createdBy: user.id,
        },
      });

      await prisma.requirementMatch.updateMany({
        where: { id: { in: picks.map((p) => p.id) } },
        data: { status: MatchStatus.RFQ_SENT, selectedForRfq: true },
      });
      await prisma.buyerRequirement.update({
        where: { id },
        data: { status: RequirementStatus.RFQ_OPEN },
      });

      const invited = await prisma.organisationMember.findMany({
        where: {
          deletedAt: null,
          organisationId: { in: picks.map((p) => p.supplierOrgId) },
        },
        select: { userId: true },
      });
      if (invited.length) {
        await prisma.notification.createMany({
          data: invited.map((m) => ({
            userId: m.userId,
            title: `RFQ open: ${requirement.commodity}`,
            body: `You were shortlisted for ${requirement.reference}. Submit your offer now.`,
            link: `/dashboard/rfqs/${rfq.id}`,
            metadata: { kind: "RFQ_INVITE", rfqId: rfq.id, requirementId: id },
          })),
        });
      }

      return ok(rfq, { status: 201 });
    }

    return fail("Unknown action", 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}
