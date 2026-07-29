import { Prisma, TradeStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function utcDay(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function daysAgo(n: number) {
  const d = utcDay();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

function num(v: Prisma.Decimal | number | null | undefined) {
  if (v == null) return 0;
  return typeof v === "number" ? v : Number(v);
}

function avg(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export type AnalyticsScope = "global" | string;

export async function computeOverview(input?: {
  orgId?: string | null;
  days?: number;
}) {
  const days = input?.days ?? 30;
  const since = daysAgo(days);
  const orgId = input?.orgId ?? null;

  const tradeWhere: Prisma.TradeWhereInput = {
    deletedAt: null,
    createdAt: { gte: since },
    ...(orgId
      ? {
          OR: [
            { buyerOrgId: orgId },
            { sellerOrgId: orgId },
            {
              participants: {
                some: { organisationId: orgId, deletedAt: null },
              },
            },
          ],
        }
      : {}),
  };

  const trades = await prisma.trade.findMany({
    where: tradeWhere,
    select: {
      id: true,
      status: true,
      value: true,
      currency: true,
      riskScore: true,
      trustScore: true,
      completionPct: true,
      corridor: true,
      originCountry: true,
      destinationCountry: true,
      commodity: true,
      createdAt: true,
    },
  });

  const activeStatuses = new Set<TradeStatus>([
    TradeStatus.PENDING_VERIFICATION,
    TradeStatus.NEGOTIATION,
    TradeStatus.CONTRACTED,
    TradeStatus.IN_PRODUCTION,
    TradeStatus.AWAITING_INSPECTION,
    TradeStatus.AWAITING_COMPLIANCE,
    TradeStatus.READY_TO_SHIP,
    TradeStatus.IN_TRANSIT,
    TradeStatus.AT_BORDER,
    TradeStatus.DELIVERED,
    TradeStatus.AWAITING_SETTLEMENT,
  ]);

  const completed = trades.filter((t) => t.status === TradeStatus.COMPLETED);
  const cancelled = trades.filter((t) => t.status === TradeStatus.CANCELLED);
  const disputed = trades.filter((t) => t.status === TradeStatus.DISPUTED);
  const active = trades.filter((t) => activeStatuses.has(t.status));

  const totalValueUsd = trades.reduce((sum, t) => sum + num(t.value), 0);

  const orgWhere: Prisma.OrganisationWhereInput = {
    deletedAt: null,
    ...(orgId ? { id: orgId } : { createdAt: { gte: since } }),
  };
  const [newOrgs, verifiedOrgs, escrowAgg, shipments, certs] =
    await Promise.all([
      prisma.organisation.count({ where: orgWhere }),
      prisma.organisation.count({
        where: {
          deletedAt: null,
          verificationStatus: "VERIFIED",
          ...(orgId ? { id: orgId } : {}),
        },
      }),
      prisma.escrowAccount.aggregate({
        where: {
          deletedAt: null,
          status: { in: ["FUNDED", "RELEASED"] },
          ...(orgId
            ? { OR: [{ buyerOrgId: orgId }, { sellerOrgId: orgId }] }
            : {}),
        },
        _sum: { amount: true },
      }),
      prisma.shipment.findMany({
        where: {
          deletedAt: null,
          createdAt: { gte: since },
          ...(orgId
            ? {
                OR: [
                  { buyerOrgId: orgId },
                  { sellerOrgId: orgId },
                  { providerOrgId: orgId },
                ],
              }
            : {}),
        },
        select: { status: true },
      }),
      prisma.complianceCertificate.count({
        where: {
          deletedAt: null,
          status: "APPROVED",
          updatedAt: { gte: since },
          ...(orgId ? { organisationId: orgId } : {}),
        },
      }),
    ]);

  const shipmentsBooked = shipments.filter((s) =>
    ["BOOKED", "IN_TRANSIT", "DELIVERED"].includes(s.status),
  ).length;
  const shipmentsDelivered = shipments.filter(
    (s) => s.status === "DELIVERED",
  ).length;

  // Volume by day for sparkline / trend
  const byDay = new Map<string, { count: number; value: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = daysAgo(i).toISOString().slice(0, 10);
    byDay.set(d, { count: 0, value: 0 });
  }
  for (const t of trades) {
    const key = t.createdAt.toISOString().slice(0, 10);
    const row = byDay.get(key);
    if (row) {
      row.count += 1;
      row.value += num(t.value);
    }
  }

  // Status breakdown
  const byStatus: Record<string, number> = {};
  for (const t of trades) {
    byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
  }

  // Corridors
  const corridorMap = new Map<
    string,
    {
      corridor: string;
      originCountry: string;
      destinationCountry: string;
      tradeCount: number;
      totalValueUsd: number;
      riskScores: number[];
      completedCount: number;
    }
  >();
  for (const t of trades) {
    const origin = t.originCountry ?? "XX";
    const dest = t.destinationCountry ?? "XX";
    const corridor = t.corridor ?? `${origin}-${dest}`;
    const cur = corridorMap.get(corridor) ?? {
      corridor,
      originCountry: origin,
      destinationCountry: dest,
      tradeCount: 0,
      totalValueUsd: 0,
      riskScores: [] as number[],
      completedCount: 0,
    };
    cur.tradeCount += 1;
    cur.totalValueUsd += num(t.value);
    cur.riskScores.push(t.riskScore);
    if (t.status === TradeStatus.COMPLETED) cur.completedCount += 1;
    corridorMap.set(corridor, cur);
  }

  // Commodities
  const commodityMap = new Map<
    string,
    {
      commodity: string;
      tradeCount: number;
      totalValueUsd: number;
      riskScores: number[];
      completedCount: number;
    }
  >();
  for (const t of trades) {
    const key = t.commodity || "Unknown";
    const cur = commodityMap.get(key) ?? {
      commodity: key,
      tradeCount: 0,
      totalValueUsd: 0,
      riskScores: [] as number[],
      completedCount: 0,
    };
    cur.tradeCount += 1;
    cur.totalValueUsd += num(t.value);
    cur.riskScores.push(t.riskScore);
    if (t.status === TradeStatus.COMPLETED) cur.completedCount += 1;
    commodityMap.set(key, cur);
  }

  return {
    periodDays: days,
    scope: orgId ?? "global",
    kpis: {
      totalTrades: trades.length,
      activeTrades: active.length,
      completedTrades: completed.length,
      cancelledTrades: cancelled.length,
      disputedTrades: disputed.length,
      totalValueUsd: Math.round(totalValueUsd * 100) / 100,
      avgCompletionPct: Math.round(avg(trades.map((t) => t.completionPct))),
      avgRiskScore: Math.round(avg(trades.map((t) => t.riskScore))),
      avgTrustScore: Math.round(avg(trades.map((t) => t.trustScore))),
      newOrgs,
      verifiedOrgs,
      totalEscrowUsd: Math.round(num(escrowAgg._sum.amount) * 100) / 100,
      shipmentsBooked,
      shipmentsDelivered,
      certsApproved: certs,
    },
    volumeTrend: Array.from(byDay.entries()).map(([date, v]) => ({
      date,
      tradeCount: v.count,
      valueUsd: Math.round(v.value * 100) / 100,
    })),
    byStatus,
    corridors: Array.from(corridorMap.values())
      .map((c) => ({
        corridor: c.corridor,
        originCountry: c.originCountry,
        destinationCountry: c.destinationCountry,
        tradeCount: c.tradeCount,
        totalValueUsd: Math.round(c.totalValueUsd * 100) / 100,
        avgRiskScore: Math.round(avg(c.riskScores)),
        completedCount: c.completedCount,
      }))
      .sort((a, b) => b.tradeCount - a.tradeCount)
      .slice(0, 20),
    commodities: Array.from(commodityMap.values())
      .map((c) => ({
        commodity: c.commodity,
        tradeCount: c.tradeCount,
        totalValueUsd: Math.round(c.totalValueUsd * 100) / 100,
        avgRiskScore: Math.round(avg(c.riskScores)),
        completedCount: c.completedCount,
      }))
      .sort((a, b) => b.totalValueUsd - a.totalValueUsd)
      .slice(0, 15),
  };
}

/** Persist today's rollup for history / heatmaps. Soft-fails if tables missing. */
export async function persistDailySnapshot(input?: {
  orgId?: string | null;
}) {
  const orgId = input?.orgId ?? null;
  const overview = await computeOverview({ orgId, days: 1 });
  const periodDate = utcDay();
  const scope = orgId ?? "global";
  const k = overview.kpis;

  try {
    await prisma.analyticsSnapshot.upsert({
      where: {
        periodDate_scope: { periodDate, scope },
      },
      create: {
        periodDate,
        scope,
        totalTrades: k.totalTrades,
        activeTrades: k.activeTrades,
        completedTrades: k.completedTrades,
        cancelledTrades: k.cancelledTrades,
        disputedTrades: k.disputedTrades,
        totalValueUsd: k.totalValueUsd,
        avgCompletionPct: k.avgCompletionPct,
        avgRiskScore: k.avgRiskScore,
        avgTrustScore: k.avgTrustScore,
        newOrgs: k.newOrgs,
        verifiedOrgs: k.verifiedOrgs,
        totalEscrowUsd: k.totalEscrowUsd,
        shipmentsBooked: k.shipmentsBooked,
        shipmentsDelivered: k.shipmentsDelivered,
        certsApproved: k.certsApproved,
      },
      update: {
        totalTrades: k.totalTrades,
        activeTrades: k.activeTrades,
        completedTrades: k.completedTrades,
        cancelledTrades: k.cancelledTrades,
        disputedTrades: k.disputedTrades,
        totalValueUsd: k.totalValueUsd,
        avgCompletionPct: k.avgCompletionPct,
        avgRiskScore: k.avgRiskScore,
        avgTrustScore: k.avgTrustScore,
        newOrgs: k.newOrgs,
        verifiedOrgs: k.verifiedOrgs,
        totalEscrowUsd: k.totalEscrowUsd,
        shipmentsBooked: k.shipmentsBooked,
        shipmentsDelivered: k.shipmentsDelivered,
        certsApproved: k.certsApproved,
      },
    });

    for (const c of overview.corridors) {
      await prisma.corridorStat.upsert({
        where: {
          periodDate_corridor: {
            periodDate,
            corridor: c.corridor,
          },
        },
        create: {
          periodDate,
          corridor: c.corridor,
          originCountry: c.originCountry.slice(0, 2),
          destinationCountry: c.destinationCountry.slice(0, 2),
          tradeCount: c.tradeCount,
          totalValueUsd: c.totalValueUsd,
          avgRiskScore: c.avgRiskScore,
          completedCount: c.completedCount,
        },
        update: {
          tradeCount: c.tradeCount,
          totalValueUsd: c.totalValueUsd,
          avgRiskScore: c.avgRiskScore,
          completedCount: c.completedCount,
          originCountry: c.originCountry.slice(0, 2),
          destinationCountry: c.destinationCountry.slice(0, 2),
        },
      });
    }

    for (const c of overview.commodities) {
      await prisma.commodityStat.upsert({
        where: {
          periodDate_commodity: {
            periodDate,
            commodity: c.commodity,
          },
        },
        create: {
          periodDate,
          commodity: c.commodity,
          tradeCount: c.tradeCount,
          totalValueUsd: c.totalValueUsd,
          avgRiskScore: c.avgRiskScore,
          completedCount: c.completedCount,
        },
        update: {
          tradeCount: c.tradeCount,
          totalValueUsd: c.totalValueUsd,
          avgRiskScore: c.avgRiskScore,
          completedCount: c.completedCount,
        },
      });
    }
  } catch (error) {
    // Tables may not exist yet if migration pending — live overview still works.
    console.warn(
      "[analytics] snapshot persist skipped:",
      error instanceof Error ? error.message : error,
    );
  }

  return overview;
}

export async function listSnapshots(input?: {
  scope?: string;
  days?: number;
}) {
  const days = input?.days ?? 30;
  const since = daysAgo(days);
  return prisma.analyticsSnapshot.findMany({
    where: {
      scope: input?.scope ?? "global",
      periodDate: { gte: since },
    },
    orderBy: { periodDate: "asc" },
  });
}
