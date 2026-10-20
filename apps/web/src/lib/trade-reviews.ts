import { prisma } from "@/lib/prisma";

export type ReviewSummary = { average: number | null; count: number };

export const REVIEW_SUB_SCORES = [
  "qualityScore",
  "onTimeScore",
  "documentationScore",
  "paymentScore",
] as const;

/** Parses a 1-5 integer rating; returns undefined when absent, null when invalid. */
export function parseRating(value: unknown): number | null | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 5) return null;
  return n;
}

/** Average rating + count received per organisation. */
export async function reviewSummaries(
  orgIds: string[],
): Promise<Map<string, ReviewSummary>> {
  const ids = [...new Set(orgIds)];
  const map = new Map<string, ReviewSummary>();
  if (!ids.length) return map;
  const rows = await prisma.tradeReview.groupBy({
    by: ["revieweeOrgId"],
    where: { revieweeOrgId: { in: ids } },
    _avg: { rating: true },
    _count: { _all: true },
  });
  for (const r of rows) {
    map.set(r.revieweeOrgId, {
      average:
        r._avg.rating == null ? null : Number(r._avg.rating.toFixed(2)),
      count: r._count._all,
    });
  }
  return map;
}

export async function reviewSummary(orgId: string): Promise<ReviewSummary> {
  return (await reviewSummaries([orgId])).get(orgId) ?? {
    average: null,
    count: 0,
  };
}
