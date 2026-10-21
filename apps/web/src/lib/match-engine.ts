import { MatchStatus, RequirementStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  aggregateMatches,
  evaluateMatch,
  type MatchCandidate,
} from "@/lib/matching";
import { reviewSummaries } from "@/lib/trade-reviews";
import { createDispatchNotifications } from "@/lib/messaging";
import { countryName } from "@/lib/corridors";

/** Requirement states where buyers are still sourcing and new supply should be matched. */
export const OPEN_DEMAND_STATUSES: RequirementStatus[] = [
  RequirementStatus.PUBLISHED,
  RequirementStatus.MATCHING,
  RequirementStatus.RFQ_OPEN,
  RequirementStatus.PARTIALLY_FILLED,
];

function commodityTerms(commodity: string) {
  // "Hass Avocado" should find lots named "Avocado" and vice versa.
  const words = commodity
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 3);
  return Array.from(new Set([commodity.trim(), ...words]));
}

/**
 * Re-run matching for one requirement, persist the match set, and notify
 * supplier orgs that are newly matched (the "dispatch" step).
 */
export async function rematchRequirement(requirementId: string) {
  const req = await prisma.buyerRequirement.findFirst({
    where: { id: requirementId, deletedAt: null },
  });
  if (!req) throw new Error("Requirement not found");

  const terms = commodityTerms(req.commodity);

  // Filter by commodity in the database so matching scales past a few lots.
  const lots = await prisma.supplyLot.findMany({
    where: {
      deletedAt: null,
      status: { in: ["DECLARED", "VERIFIED", "EXPORT_ELIGIBLE"] },
      availableQuantity: { gt: 0 },
      OR: terms.map((t) => ({
        commodity: { contains: t, mode: "insensitive" as const },
      })),
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
    orderBy: { availableQuantity: "desc" },
    take: 200,
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
    // A lot can be matched once its farm has passed business verification
    // (KYB) or the lot itself has been verified.
    exportEligible:
      ["VERIFIED", "EXPORT_ELIGIBLE"].includes(lot.status) ||
      lot.supplierOrg.verificationStatus === "VERIFIED",
    capacityDeclared: true,
  }));

  // Listed farms/exporters who grow this crop but have no lot yet are
  // surfaced as prospects with zero confirmed volume — never invented volume.
  const registries = await prisma.registryProfile.findMany({
    where: {
      deletedAt: null,
      isListed: true,
      NOT: { commodities: { isEmpty: true } },
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
    take: 100,
  });

  for (const r of registries) {
    if (candidates.some((c) => c.supplierOrgId === r.organisationId)) continue;
    const crop = r.commodities.find(
      (c) =>
        c.toLowerCase().includes(req.commodity.toLowerCase()) ||
        req.commodity.toLowerCase().includes(c.toLowerCase()),
    );
    if (!crop) continue;
    candidates.push({
      supplierOrgId: r.organisationId,
      supplyLotId: null,
      commodity: crop,
      certifications: [],
      availableQty: 0,
      originCountry: r.organisation.countryCode,
      trustScore: r.organisation.trustProfile?.trustScore ?? 50,
      yearsInOperation: r.yearsInOperation,
      isListed: r.isListed,
      exportEligible: r.organisation.verificationStatus === "VERIFIED",
      capacityDeclared: false,
    });
  }

  const ratings = await reviewSummaries(candidates.map((c) => c.supplierOrgId));
  for (const c of candidates) {
    const r = ratings.get(c.supplierOrgId);
    c.reviewAverage = r?.average ?? null;
    c.reviewCount = r?.count ?? 0;
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

  const previous = await prisma.requirementMatch.findMany({
    where: { requirementId },
    select: {
      supplierOrgId: true,
      supplyLotId: true,
      status: true,
      selectedForRfq: true,
    },
  });
  const previouslyMatched = new Set(previous.map((p) => p.supplierOrgId));
  // Keep buyer progress (selected, RFQ sent, offered…) across re-matches.
  const priorState = new Map(
    previous.map((p) => [`${p.supplierOrgId}:${p.supplyLotId ?? ""}`, p]),
  );

  await prisma.requirementMatch.deleteMany({ where: { requirementId } });
  if (scored.length) {
    await prisma.requirementMatch.createMany({
      data: scored.map((m) => {
        const prior = priorState.get(`${m.supplierOrgId}:${m.supplyLotId ?? ""}`);
        return {
          requirementId,
          supplyLotId: m.supplyLotId ?? undefined,
          supplierOrgId: m.supplierOrgId,
          score: m.score,
          availableQty: m.availableQty,
          quantityMatched: m.quantityMatched,
          reasons: m.reasons,
          status: prior?.status ?? MatchStatus.SUGGESTED,
          selectedForRfq: prior?.selectedForRfq ?? false,
        };
      }),
    });
  }

  await prisma.buyerRequirement.update({
    where: { id: requirementId },
    data: {
      matchedQuantity: agg.matchedQuantity,
      // Only advance a fresh listing; never pull an RFQ-stage requirement back.
      ...(req.status === RequirementStatus.PUBLISHED
        ? { status: RequirementStatus.MATCHING }
        : {}),
    },
  });

  const newSupplierOrgIds = Array.from(
    new Set(
      scored
        .map((m) => m.supplierOrgId)
        .filter((id) => !previouslyMatched.has(id)),
    ),
  );
  if (OPEN_DEMAND_STATUSES.includes(req.status) && newSupplierOrgIds.length) {
    await notifyMatchedSuppliers(newSupplierOrgIds, {
      requirementId,
      reference: req.reference,
      commodity: req.commodity,
      quantity: Number(req.quantity),
      unit: req.unit,
      destinationCountry: req.destinationCountry,
    });
  }

  return { matches: scored, aggregation: agg };
}

async function notifyMatchedSuppliers(
  supplierOrgIds: string[],
  r: {
    requirementId: string;
    reference: string;
    commodity: string;
    quantity: number;
    unit: string;
    destinationCountry: string;
  },
) {
  const members = await prisma.organisationMember.findMany({
    where: { organisationId: { in: supplierOrgIds }, deletedAt: null },
    select: { userId: true, organisationId: true },
  });
  if (!members.length) return;
  // In-app now; WhatsApp/SMS after the response (lib/messaging.ts).
  await createDispatchNotifications(
    members.map((m) => ({
      userId: m.userId,
      organisationId: m.organisationId,
      title: `New buyer match: ${r.commodity}`,
      body: `A buyer in ${countryName(r.destinationCountry) || r.destinationCountry} needs ${r.quantity} ${r.unit} of ${r.commodity} (${r.reference}). Your supply fits — respond before other farms do.`,
      link: "/dashboard/demand",
      metadata: {
        kind: "REQUIREMENT_MATCH",
        requirementId: r.requirementId,
        supplierOrgId: m.organisationId,
      },
    })),
  );
}

/**
 * Two-sided liquidity: when a farm declares a new lot, re-match every open
 * buyer requirement for that crop so the farm is dispatched immediately.
 */
export async function matchOpenDemandForLot(lot: {
  commodity: string;
  originCountry: string;
}) {
  const terms = commodityTerms(lot.commodity);
  const open = await prisma.buyerRequirement.findMany({
    where: {
      deletedAt: null,
      status: { in: OPEN_DEMAND_STATUSES },
      OR: terms.map((t) => ({
        commodity: { contains: t, mode: "insensitive" as const },
      })),
    },
    select: { id: true, originPreference: true },
    orderBy: { publishedAt: "desc" },
    take: 25,
  });
  const relevant = open.filter(
    (r) => (r.originPreference ?? "KE").toUpperCase() === lot.originCountry,
  );
  for (const r of relevant) {
    await rematchRequirement(r.id);
  }
  return relevant.length;
}
