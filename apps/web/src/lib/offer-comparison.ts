import { estimateLandedCostUsdPerKg } from "@/lib/matching";

export type OfferComparisonRow = {
  offerId: string;
  supplierName: string;
  supplierOrgId: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  currency: string;
  estimatedLandedCostPerKg: number;
  trustScore: number;
  matchScore: number;
  leadTimeDays: number | null;
  validUntil: Date | null;
  status: string;
  version: number;
  versionCount: number;
  notes?: string | null;
};

export type OfferSortKey =
  | "best_match"
  | "lowest_landed_cost"
  | "highest_trust"
  | "earliest_delivery";

export function buildOfferComparisonRow(input: {
  offer: {
    id: string;
    unitPrice: number | string;
    quantity: number | string;
    unit: string;
    currency: string;
    status: string;
    notes?: string | null;
    leadTimeDays?: number | null;
    validUntil?: Date | string | null;
    currentVersion?: number;
    versions?: { version: number }[];
    sellerOrg: {
      id: string;
      name: string;
      trustProfile?: { trustScore: number } | null;
    };
  };
  destinationCountry?: string | null;
  matchScore?: number;
}): OfferComparisonRow {
  const unitPrice = Number(input.offer.unitPrice);
  const landed = estimateLandedCostUsdPerKg({
    unitPrice,
    unit: input.offer.unit,
    destinationCountry: input.destinationCountry,
  });

  return {
    offerId: input.offer.id,
    supplierName: input.offer.sellerOrg.name,
    supplierOrgId: input.offer.sellerOrg.id,
    quantity: Number(input.offer.quantity),
    unit: input.offer.unit,
    unitPrice,
    currency: input.offer.currency,
    estimatedLandedCostPerKg: landed.estimatedCif,
    trustScore: input.offer.sellerOrg.trustProfile?.trustScore ?? 50,
    matchScore: input.matchScore ?? 0,
    leadTimeDays: input.offer.leadTimeDays ?? null,
    validUntil: input.offer.validUntil
      ? new Date(input.offer.validUntil)
      : null,
    status: input.offer.status,
    version: input.offer.currentVersion ?? 1,
    versionCount: input.offer.versions?.length ?? 1,
    notes: input.offer.notes,
  };
}

export function sortOfferRows(
  rows: OfferComparisonRow[],
  sort: OfferSortKey,
): OfferComparisonRow[] {
  const copy = [...rows];
  switch (sort) {
    case "lowest_landed_cost":
      return copy.sort(
        (a, b) => a.estimatedLandedCostPerKg - b.estimatedLandedCostPerKg,
      );
    case "highest_trust":
      return copy.sort((a, b) => b.trustScore - a.trustScore);
    case "earliest_delivery":
      return copy.sort(
        (a, b) =>
          (a.leadTimeDays ?? 9999) - (b.leadTimeDays ?? 9999),
      );
    case "best_match":
    default:
      return copy.sort((a, b) => {
        const scoreA = a.matchScore * 0.6 + a.trustScore * 0.4;
        const scoreB = b.matchScore * 0.6 + b.trustScore * 0.4;
        return scoreB - scoreA;
      });
  }
}
