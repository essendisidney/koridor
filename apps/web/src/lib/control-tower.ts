import {
  DealStatus,
  RequirementStatus,
  RfqStatus,
  VerificationStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MILESTONE_TEMPLATE } from "@/lib/trade-passport";

export type ExceptionSeverity = "INFO" | "WARNING" | "CRITICAL";

export type ControlException = {
  id: string;
  type:
    | "SUPPLY_SHORTFALL"
    | "DOCUMENT_MISSING"
    | "VERIFICATION_PENDING"
    | "CONTRACT_EXPIRING"
    | "SHIPMENT_DELAY"
    | "RFQ_STALE";
  severity: ExceptionSeverity;
  title: string;
  detail: string;
  href?: string;
  entityType: string;
  entityId: string;
};

/** Compute operational exceptions for Control Tower (no fake metrics). */
export async function listControlExceptions(): Promise<ControlException[]> {
  const exceptions: ControlException[] = [];

  const [requirements, openRfqs, pendingOrgs, activeTrades] = await Promise.all([
    prisma.buyerRequirement.findMany({
      where: {
        deletedAt: null,
        status: {
          in: [
            RequirementStatus.PUBLISHED,
            RequirementStatus.MATCHING,
            RequirementStatus.RFQ_OPEN,
            RequirementStatus.PARTIALLY_FILLED,
          ],
        },
      },
      select: {
        id: true,
        reference: true,
        commodity: true,
        quantity: true,
        unit: true,
        matchedQuantity: true,
        status: true,
      },
      take: 40,
    }),
    prisma.rfq.findMany({
      where: { deletedAt: null, status: RfqStatus.OPEN },
      select: {
        id: true,
        reference: true,
        title: true,
        publishedAt: true,
        createdAt: true,
      },
      take: 40,
    }),
    prisma.organisation.findMany({
      where: {
        deletedAt: null,
        verificationStatus: VerificationStatus.PENDING,
      },
      select: { id: true, name: true, type: true },
      take: 30,
    }),
    prisma.trade.findMany({
      where: {
        deletedAt: null,
        status: {
          notIn: ["COMPLETED", "CANCELLED"],
        },
      },
      select: {
        id: true,
        tradeNumber: true,
        title: true,
        currentStage: true,
        completionPct: true,
        milestones: {
          where: { deletedAt: null },
          select: {
            code: true,
            status: true,
            requiredEvidenceTypes: true,
            evidence: {
              where: { deletedAt: null },
              select: { type: true },
            },
          },
        },
        contracts: {
          where: { deletedAt: null },
          select: {
            id: true,
            reference: true,
            status: true,
            shipmentRequests: {
              where: { deletedAt: null },
              select: {
                status: true,
                shipment: { select: { status: true, departedAt: true } },
              },
            },
          },
        },
      },
      take: 40,
    }),
  ]);

  for (const req of requirements) {
    const needed = Number(req.quantity);
    const matched = Number(req.matchedQuantity);
    if (needed > 0 && matched < needed * 0.95) {
      const gap = Math.round((needed - matched) * 100) / 100;
      exceptions.push({
        id: `shortfall-${req.id}`,
        type: "SUPPLY_SHORTFALL",
        severity: matched === 0 ? "CRITICAL" : "WARNING",
        title: `Supply shortfall · ${req.reference}`,
        detail: `${req.commodity}: ${matched}/${needed} ${req.unit} matched · gap ${gap} ${req.unit}`,
        href: `/dashboard/requirements/${req.id}/matches`,
        entityType: "BuyerRequirement",
        entityId: req.id,
      });
    }
  }

  const staleCutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
  for (const rfq of openRfqs) {
    const published = (rfq.publishedAt ?? rfq.createdAt).getTime();
    if (published < staleCutoff) {
      exceptions.push({
        id: `rfq-stale-${rfq.id}`,
        type: "RFQ_STALE",
        severity: "INFO",
        title: `Open RFQ aging · ${rfq.reference}`,
        detail: `${rfq.title} has been open more than 14 days.`,
        href: `/dashboard/rfqs/${rfq.id}`,
        entityType: "Rfq",
        entityId: rfq.id,
      });
    }
  }

  for (const org of pendingOrgs) {
    exceptions.push({
      id: `verify-${org.id}`,
      type: "VERIFICATION_PENDING",
      severity: "WARNING",
      title: `Verification pending · ${org.name}`,
      detail: `${org.type.replaceAll("_", " ")} awaiting review.`,
      href: "/dashboard/reviews",
      entityType: "Organisation",
      entityId: org.id,
    });
  }

  for (const trade of activeTrades) {
    const requiredTypes = new Set<string>();
    const presentTypes = new Set<string>();
    for (const m of trade.milestones) {
      for (const t of m.requiredEvidenceTypes) requiredTypes.add(t);
      for (const e of m.evidence) presentTypes.add(e.type);
    }
    // Also include template types for incomplete early trades
    if (requiredTypes.size === 0) {
      for (const t of MILESTONE_TEMPLATE) {
        for (const e of t.requiredEvidenceTypes) requiredTypes.add(e);
      }
    }
    const missing = [...requiredTypes].filter((t) => !presentTypes.has(t));
    if (missing.length > 0 && trade.completionPct < 100) {
      exceptions.push({
        id: `docs-${trade.id}`,
        type: "DOCUMENT_MISSING",
        severity: missing.length >= 3 ? "CRITICAL" : "WARNING",
        title: `Documents missing · ${trade.tradeNumber}`,
        detail: `Missing: ${missing
          .slice(0, 4)
          .map((m) => m.replaceAll("_", " "))
          .join(", ")}${missing.length > 4 ? "…" : ""}`,
        href: `/dashboard/trades/${trade.id}`,
        entityType: "Trade",
        entityId: trade.id,
      });
    }

    const pendingContract = trade.contracts.find(
      (c) => c.status === "PENDING_SIGNATURES",
    );
    if (pendingContract) {
      exceptions.push({
        id: `contract-${pendingContract.id}`,
        type: "CONTRACT_EXPIRING",
        severity: "WARNING",
        title: `Contract pending signatures · ${pendingContract.reference}`,
        detail: `${trade.tradeNumber} · ${trade.title}`,
        href: `/dashboard/contracts/${pendingContract.id}`,
        entityType: "Contract",
        entityId: pendingContract.id,
      });
    }

    for (const c of trade.contracts) {
      for (const sr of c.shipmentRequests) {
        if (
          sr.status === "IN_TRANSIT" ||
          sr.shipment?.status === "IN_TRANSIT"
        ) {
          const departed = sr.shipment?.departedAt?.getTime();
          if (departed && Date.now() - departed > 21 * 24 * 60 * 60 * 1000) {
            exceptions.push({
              id: `ship-${trade.id}`,
              type: "SHIPMENT_DELAY",
              severity: "CRITICAL",
              title: `Shipment delayed · ${trade.tradeNumber}`,
              detail: "In transit more than 21 days without delivery confirmation.",
              href: `/dashboard/logistics`,
              entityType: "Trade",
              entityId: trade.id,
            });
          }
        }
      }
    }
  }

  const severityRank: Record<ExceptionSeverity, number> = {
    CRITICAL: 0,
    WARNING: 1,
    INFO: 2,
  };
  return exceptions.sort(
    (a, b) => severityRank[a.severity] - severityRank[b.severity],
  );
}

export async function controlTowerPipeline() {
  const [
    requirements,
    rfqsOpen,
    deals,
    supplyLots,
    shipments,
    verificationQueue,
    exceptions,
  ] = await Promise.all([
    prisma.buyerRequirement.count({
      where: {
        deletedAt: null,
        status: {
          in: [
            RequirementStatus.PUBLISHED,
            RequirementStatus.MATCHING,
            RequirementStatus.RFQ_OPEN,
            RequirementStatus.PARTIALLY_FILLED,
          ],
        },
      },
    }),
    prisma.rfq.count({
      where: { deletedAt: null, status: RfqStatus.OPEN },
    }),
    prisma.deal.count({
      where: {
        deletedAt: null,
        status: {
          notIn: [DealStatus.COMPLETED, DealStatus.CANCELLED],
        },
      },
    }),
    prisma.supplyLot.count({ where: { deletedAt: null } }),
    prisma.shipment.count({
      where: {
        deletedAt: null,
        status: { in: ["BOOKED", "IN_TRANSIT"] },
      },
    }),
    prisma.organisation.count({
      where: {
        deletedAt: null,
        verificationStatus: VerificationStatus.PENDING,
      },
    }),
    listControlExceptions(),
  ]);

  return {
    requirements,
    rfqsOpen,
    deals,
    supplyLots,
    shipments,
    verificationQueue,
    exceptionCount: exceptions.length,
    exceptions: exceptions.slice(0, 40),
  };
}
