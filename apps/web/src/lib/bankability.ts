import { ActivityType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recomputeTrustScore } from "@/lib/trust-score";

export type BankabilityInsight = {
  kind: string;
  title: string;
  body: string;
  severity: "info" | "warn" | "high";
};

export type BankabilityBreakdown = {
  identity: number;
  tradePerformance: number;
  repayment: number;
  logistics: number;
  total: number;
};

export type BankabilityResult = {
  score: number;
  breakdown: BankabilityBreakdown;
  suggestedCreditLimit: number;
  currency: string;
  insights: BankabilityInsight[];
  metrics: {
    trustScore: number;
    tradeCount: number;
    closedTrades: number;
    avgCompletionPct: number;
    escrowFunded: number;
    escrowReleased: number;
    repaymentRate: number | null;
    shipmentsTotal: number;
    shipmentsDelivered: number;
    deliveryRate: number | null;
  };
};

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

/** Map bankability 0–100 → suggested in-kind credit limit (USD). */
export function creditLimitFromScore(score: number): number {
  if (score < 25) return 0;
  if (score < 40) return 2_500;
  if (score < 55) return 7_500;
  if (score < 70) return 20_000;
  if (score < 85) return 50_000;
  return 100_000;
}

export async function computeBankability(
  organisationId: string,
  actorId?: string,
): Promise<BankabilityResult> {
  let trust = await prisma.trustProfile.findFirst({
    where: { organisationId, deletedAt: null },
  });
  if (!trust) {
    trust = await recomputeTrustScore(organisationId, actorId);
  }

  const [trades, escrowsAsBuyer, shipments] = await Promise.all([
    prisma.trade.findMany({
      where: {
        deletedAt: null,
        OR: [{ buyerOrgId: organisationId }, { sellerOrgId: organisationId }],
      },
      select: {
        status: true,
        completionPct: true,
        riskScore: true,
      },
      take: 200,
    }),
    prisma.escrowAccount.findMany({
      where: { buyerOrgId: organisationId, deletedAt: null },
      select: { status: true, amount: true },
      take: 200,
    }),
    prisma.shipment.findMany({
      where: {
        deletedAt: null,
        OR: [
          { buyerOrgId: organisationId },
          { sellerOrgId: organisationId },
          { providerOrgId: organisationId },
        ],
      },
      select: { status: true },
      take: 200,
    }),
  ]);

  const insights: BankabilityInsight[] = [];

  // Identity — up to 30 from trust score
  const identity = clamp((trust.trustScore / 100) * 30, 0, 30);
  if (trust.trustScore < 50) {
    insights.push({
      kind: "identity",
      title: "Identity still thin",
      body: `Trust score is ${trust.trustScore}/100. Stronger KYB/docs lifts bankability.`,
      severity: "warn",
    });
  } else {
    insights.push({
      kind: "identity",
      title: "Identity foundation",
      body: `Trust score ${trust.trustScore}/100 contributes ${identity}/30 to bankability.`,
      severity: "info",
    });
  }

  // Trade performance — up to 25
  const tradeCount = trades.length;
  const closedTrades = trades.filter(
    (t) => t.status === "COMPLETED" || t.status === "DELIVERED",
  ).length;
  const avgCompletionPct =
    tradeCount === 0
      ? 0
      : trades.reduce((s, t) => s + t.completionPct, 0) / tradeCount;
  let tradePerformance = 0;
  if (tradeCount === 0) {
    insights.push({
      kind: "trade",
      title: "No trade history",
      body: "Complete Trade Passport milestones to become financially visible.",
      severity: "warn",
    });
  } else {
    tradePerformance = clamp(
      closedTrades * 4 + (avgCompletionPct / 100) * 15,
      0,
      25,
    );
    insights.push({
      kind: "trade",
      title: "Trade performance",
      body: `${tradeCount} trades · ${closedTrades} closed/settled · avg completion ${Math.round(avgCompletionPct)}%.`,
      severity: tradePerformance < 10 ? "warn" : "info",
    });
  }

  // Repayment / escrow discipline — up to 25
  const escrowFunded = escrowsAsBuyer.filter(
    (e) => e.status === "FUNDED" || e.status === "RELEASED",
  ).length;
  const escrowReleased = escrowsAsBuyer.filter(
    (e) => e.status === "RELEASED",
  ).length;
  const repaymentRate =
    escrowFunded === 0 ? null : escrowReleased / escrowFunded;
  let repayment = 0;
  if (escrowFunded === 0) {
    insights.push({
      kind: "repayment",
      title: "No escrow track record",
      body: "Fund and release escrow on trades to prove repayment discipline.",
      severity: "info",
    });
  } else {
    repayment = clamp((repaymentRate ?? 0) * 25, 0, 25);
    if ((repaymentRate ?? 0) < 0.7) {
      insights.push({
        kind: "repayment",
        title: "Escrow release lag",
        body: `${escrowReleased}/${escrowFunded} funded escrows released. Faster clean settlement improves credit.`,
        severity: "warn",
      });
    } else {
      insights.push({
        kind: "repayment",
        title: "Clean settlement history",
        body: `${escrowReleased}/${escrowFunded} funded escrows released (${Math.round((repaymentRate ?? 0) * 100)}%).`,
        severity: "info",
      });
    }
  }

  // Logistics reliability — up to 20
  const shipmentsTotal = shipments.length;
  const shipmentsDelivered = shipments.filter(
    (s) => s.status === "DELIVERED",
  ).length;
  const deliveryRate =
    shipmentsTotal === 0 ? null : shipmentsDelivered / shipmentsTotal;
  let logistics = 0;
  if (shipmentsTotal === 0) {
    insights.push({
      kind: "logistics",
      title: "No shipment history",
      body: "Delivered shipments reduce perceived transit risk for lenders.",
      severity: "info",
    });
  } else {
    logistics = clamp((deliveryRate ?? 0) * 20, 0, 20);
    insights.push({
      kind: "logistics",
      title: "Logistics reliability",
      body: `${shipmentsDelivered}/${shipmentsTotal} shipments delivered.`,
      severity: (deliveryRate ?? 0) < 0.5 ? "warn" : "info",
    });
  }

  const breakdown: BankabilityBreakdown = {
    identity,
    tradePerformance,
    repayment,
    logistics,
    total: clamp(identity + tradePerformance + repayment + logistics),
  };
  const score = breakdown.total;
  const suggestedCreditLimit = creditLimitFromScore(score);
  const currency = "USD";

  if (suggestedCreditLimit > 0) {
    insights.push({
      kind: "limit",
      title: "Suggested in-kind credit",
      body: `Heuristic limit ${suggestedCreditLimit.toLocaleString()} ${currency} for supplier inputs — not cash.`,
      severity: "info",
    });
  } else {
    insights.push({
      kind: "limit",
      title: "Credit limit withheld",
      body: "Raise bankability above 25 to unlock an in-kind trade credit facility.",
      severity: "high",
    });
  }

  return {
    score,
    breakdown,
    suggestedCreditLimit,
    currency,
    insights,
    metrics: {
      trustScore: trust.trustScore,
      tradeCount,
      closedTrades,
      avgCompletionPct: Math.round(avgCompletionPct),
      escrowFunded,
      escrowReleased,
      repaymentRate,
      shipmentsTotal,
      shipmentsDelivered,
      deliveryRate,
    },
  };
}

export async function recomputeBankability(
  organisationId: string,
  actorId?: string,
) {
  const result = await computeBankability(organisationId, actorId);

  const profile = await prisma.trustProfile.upsert({
    where: { organisationId },
    create: {
      organisationId,
      trustScore: result.metrics.trustScore,
      scoreBreakdown: {},
      bankabilityScore: result.score,
      bankabilityBreakdown: {
        ...result.breakdown,
        insights: result.insights,
        metrics: result.metrics,
      },
      suggestedCreditLimit: result.suggestedCreditLimit,
      bankabilityScoredAt: new Date(),
      lastScoredAt: new Date(),
      createdBy: actorId,
      updatedBy: actorId,
    },
    update: {
      bankabilityScore: result.score,
      bankabilityBreakdown: {
        ...result.breakdown,
        insights: result.insights,
        metrics: result.metrics,
      },
      suggestedCreditLimit: result.suggestedCreditLimit,
      bankabilityScoredAt: new Date(),
      updatedBy: actorId,
      deletedAt: null,
    },
  });

  await prisma.activity.create({
    data: {
      type: ActivityType.BANKABILITY_UPDATED,
      title: "Bankability score updated",
      description: `Score ${result.score}/100 · suggested credit ${result.suggestedCreditLimit} ${result.currency}`,
      actorId,
      organisationId,
      entityType: "TrustProfile",
      entityId: profile.id,
      metadata: {
        score: result.score,
        suggestedCreditLimit: result.suggestedCreditLimit,
        breakdown: result.breakdown,
      },
    },
  });

  return { profile, result };
}

export function decimalStr(value: Prisma.Decimal | number | string) {
  return Number(value).toFixed(2);
}
