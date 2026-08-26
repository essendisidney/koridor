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
import {
  aggregateMatches,
  evaluateMatch,
  type MatchCandidate,
} from "@/lib/matching";
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

async function rematch(requirementId: string) {
  const req = await loadRequirement(requirementId);
  if (!req) throw new Error("Requirement not found");

  const lots = await prisma.supplyLot.findMany({
    where: {
      deletedAt: null,
      status: { in: ["DECLARED", "VERIFIED", "EXPORT_ELIGIBLE"] },
      availableQuantity: { gt: 0 },
    },
    include: {
      supplierOrg: {
        include: {
          trustProfile: { select: { trustScore: true } },
          registryProfile: {
            select: { yearsInOperation: true, isListed: true },
          },
        },
      },
    },
    take: 80,
  });

  const candidates: MatchCandidate[] = lots.map((lot) => ({
    supplierOrgId: lot.supplierOrgId,
    supplyLotId: lot.id,
    commodity: lot.commodity,
    certifications: lot.certifications,
    availableQty: Number(lot.availableQuantity),
    grade: lot.grade,
    harvestStart: lot.harvestStart,
    harvestEnd: lot.harvestEnd,
    originCountry: lot.originCountry,
    trustScore: lot.supplierOrg.trustProfile?.trustScore ?? 50,
    yearsInOperation: lot.supplierOrg.registryProfile?.yearsInOperation ?? null,
    isListed: lot.supplierOrg.registryProfile?.isListed ?? false,
    exportEligible: ["VERIFIED", "EXPORT_ELIGIBLE"].includes(lot.status),
  }));

  // Also match registry exporters without lots
  const registries = await prisma.registryProfile.findMany({
    where: {
      deletedAt: null,
      isListed: true,
      organisation: {
        deletedAt: null,
        type: { in: ["EXPORTER", "COOPERATIVE", "FARMER"] },
        countryCode: req.originPreference ?? "KE",
      },
    },
    include: {
      organisation: {
        include: { trustProfile: { select: { trustScore: true } } },
      },
    },
    take: 40,
  });

  for (const r of registries) {
    if (candidates.some((c) => c.supplierOrgId === r.organisationId)) continue;
    const commodities = r.commodities ?? [];
    const hit = commodities.some((c) =>
      c.toLowerCase().includes(req.commodity.toLowerCase()) ||
      req.commodity.toLowerCase().includes(c.toLowerCase()),
    );
    if (!hit && commodities.length) continue;
    candidates.push({
      supplierOrgId: r.organisationId,
      supplyLotId: null,
      commodity: commodities[0] ?? req.commodity,
      certifications: [],
      availableQty: Number(req.quantity) * 0.4,
      originCountry: r.organisation.countryCode,
      trustScore: r.organisation.trustProfile?.trustScore ?? 50,
      yearsInOperation: r.yearsInOperation,
      isListed: r.isListed,
      exportEligible: r.organisation.verificationStatus === "VERIFIED",
    });
  }

  const reqInput = {
    commodity: req.commodity,
    quantity: Number(req.quantity),
    certifications: req.certifications,
    grade: req.grade,
    deliveryStart: req.deliveryStart,
    deliveryEnd: req.deliveryEnd,
    originPreference: req.originPreference,
  };

  const scored = candidates
    .map((c) => evaluateMatch(reqInput, c))
    .filter((m): m is NonNullable<typeof m> => m !== null)
    .sort((a, b) => b.score - a.score);

  const agg = aggregateMatches(scored, Number(req.quantity));

  await prisma.requirementMatch.deleteMany({ where: { requirementId } });
  if (scored.length) {
    await prisma.requirementMatch.createMany({
      data: scored.map((m) => ({
        requirementId,
        supplyLotId: m.supplyLotId ?? undefined,
        supplierOrgId: m.supplierOrgId,
        score: m.score,
        availableQty: m.availableQty,
        quantityMatched: m.quantityMatched,
        reasons: m.reasons,
        status: MatchStatus.SUGGESTED,
      })),
    });
  }

  await prisma.buyerRequirement.update({
    where: { id: requirementId },
    data: {
      matchedQuantity: agg.matchedQuantity,
      status:
        req.status === RequirementStatus.DRAFT
          ? req.status
          : RequirementStatus.MATCHING,
    },
  });

  return { matches: scored, aggregation: agg };
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
      const result = await rematch(id);
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

      return ok(rfq, { status: 201 });
    }

    return fail("Unknown action", 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}
