import {
  Prisma,
  TradeEvidenceType,
  TradeMilestoneStatus,
  TradeStatus,
  VerificationStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { tradeReference } from "@/lib/trade";

export const MILESTONE_TEMPLATE: {
  code: string;
  title: string;
  sequence: number;
  requiredEvidenceTypes: TradeEvidenceType[];
  dependsOnCodes: string[];
}[] = [
  {
    code: "BUYER_VERIFIED",
    title: "Buyer Verified",
    sequence: 1,
    requiredEvidenceTypes: [],
    dependsOnCodes: [],
  },
  {
    code: "SUPPLIER_VERIFIED",
    title: "Supplier Verified",
    sequence: 2,
    requiredEvidenceTypes: [],
    dependsOnCodes: [],
  },
  {
    code: "CONTRACT_SIGNED",
    title: "Contract Signed",
    sequence: 3,
    requiredEvidenceTypes: [
      TradeEvidenceType.CONTRACT_PDF,
      TradeEvidenceType.DIGITAL_SIGNATURE,
    ],
    dependsOnCodes: ["BUYER_VERIFIED", "SUPPLIER_VERIFIED"],
  },
  {
    code: "DEPOSIT_RECEIVED",
    title: "Deposit Received",
    sequence: 4,
    requiredEvidenceTypes: [TradeEvidenceType.PAYMENT_PROOF],
    dependsOnCodes: ["CONTRACT_SIGNED"],
  },
  {
    code: "PRODUCTION_STARTED",
    title: "Production Started",
    sequence: 5,
    requiredEvidenceTypes: [],
    dependsOnCodes: ["CONTRACT_SIGNED"],
  },
  {
    code: "PRODUCTION_COMPLETE",
    title: "Production Complete",
    sequence: 6,
    requiredEvidenceTypes: [],
    dependsOnCodes: ["PRODUCTION_STARTED"],
  },
  {
    code: "INSPECTION_PASSED",
    title: "Inspection Passed",
    sequence: 7,
    requiredEvidenceTypes: [TradeEvidenceType.INSPECTION_REPORT],
    dependsOnCodes: ["PRODUCTION_COMPLETE"],
  },
  {
    code: "CERTIFICATE_APPROVED",
    title: "Certificate Approved",
    sequence: 8,
    requiredEvidenceTypes: [TradeEvidenceType.CERTIFICATE],
    dependsOnCodes: ["INSPECTION_PASSED"],
  },
  {
    code: "SHIPMENT_BOOKED",
    title: "Shipment Booked",
    sequence: 9,
    requiredEvidenceTypes: [TradeEvidenceType.BILL_OF_LADING],
    dependsOnCodes: ["CERTIFICATE_APPROVED"],
  },
  {
    code: "BORDER_EXIT",
    title: "Border Exit",
    sequence: 10,
    requiredEvidenceTypes: [],
    dependsOnCodes: ["SHIPMENT_BOOKED"],
  },
  {
    code: "BORDER_ENTRY",
    title: "Border Entry",
    sequence: 11,
    requiredEvidenceTypes: [],
    dependsOnCodes: ["BORDER_EXIT"],
  },
  {
    code: "DELIVERED",
    title: "Delivered",
    sequence: 12,
    requiredEvidenceTypes: [TradeEvidenceType.PROOF_OF_DELIVERY],
    dependsOnCodes: ["BORDER_ENTRY"],
  },
  {
    code: "SETTLEMENT_COMPLETE",
    title: "Settlement Complete",
    sequence: 13,
    requiredEvidenceTypes: [TradeEvidenceType.PAYMENT_PROOF],
    dependsOnCodes: ["DELIVERED"],
  },
  {
    code: "CLOSED",
    title: "Closed",
    sequence: 14,
    requiredEvidenceTypes: [],
    dependsOnCodes: ["SETTLEMENT_COMPLETE"],
  },
];

export const STATUS_STAGE: Record<TradeStatus, string> = {
  DRAFT: "Opportunity",
  PENDING_VERIFICATION: "Pending Verification",
  NEGOTIATION: "Negotiation",
  CONTRACTED: "Contract Signed",
  IN_PRODUCTION: "Production",
  AWAITING_INSPECTION: "Inspection",
  AWAITING_COMPLIANCE: "Compliance",
  READY_TO_SHIP: "Ready to Ship",
  IN_TRANSIT: "Shipment",
  AT_BORDER: "Border Clearance",
  DELIVERED: "Delivery",
  AWAITING_SETTLEMENT: "Settlement",
  COMPLETED: "Trade Completed",
  CANCELLED: "Cancelled",
  DISPUTED: "Disputed",
};

const ADVANCE_ORDER: TradeStatus[] = [
  TradeStatus.DRAFT,
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
  TradeStatus.COMPLETED,
];

export function tradeNumber() {
  return tradeReference("TRD");
}

export async function seedTradeMilestones(input: {
  tradeId: string;
  buyerOrgId: string;
  sellerOrgId?: string | null;
  actorId?: string;
}) {
  return prisma.tradeMilestone.createMany({
    data: MILESTONE_TEMPLATE.map((m) => ({
      tradeId: input.tradeId,
      code: m.code,
      title: m.title,
      sequence: m.sequence,
      requiredEvidenceTypes: m.requiredEvidenceTypes,
      dependsOnCodes: m.dependsOnCodes,
      ownerOrgId:
        m.code.startsWith("BUYER") || m.code === "DEPOSIT_RECEIVED"
          ? input.buyerOrgId
          : input.sellerOrgId ?? input.buyerOrgId,
      createdBy: input.actorId,
      updatedBy: input.actorId,
    })),
    skipDuplicates: true,
  });
}

export function nextStatus(current: TradeStatus): TradeStatus | null {
  if (
    current === TradeStatus.CANCELLED ||
    current === TradeStatus.DISPUTED ||
    current === TradeStatus.COMPLETED
  ) {
    return null;
  }
  const idx = ADVANCE_ORDER.indexOf(current);
  if (idx < 0 || idx >= ADVANCE_ORDER.length - 1) return null;
  return ADVANCE_ORDER[idx + 1];
}

export async function computeReadiness(tradeId: string) {
  const trade = await prisma.trade.findFirst({
    where: { id: tradeId, deletedAt: null },
    include: {
      milestones: {
        where: { deletedAt: null },
        include: { evidence: { where: { deletedAt: null } } },
        orderBy: { sequence: "asc" },
      },
    },
  });
  if (!trade) throw new Error("Trade not found");

  const milestoneByCode = new Map(
    trade.milestones.map((m) => [m.code, m]),
  );

  const milestoneOk = (code: string) =>
    milestoneByCode.get(code)?.status === TradeMilestoneStatus.COMPLETED;

  type ReadinessItem = { key: string; label: string; ok: boolean; stub?: boolean };

  const items: ReadinessItem[] = [
    {
      key: "buyer_verified",
      label: "Buyer Verified",
      ok: milestoneOk("BUYER_VERIFIED"),
    },
    {
      key: "supplier_verified",
      label: "Supplier Verified",
      ok: milestoneOk("SUPPLIER_VERIFIED"),
    },
    {
      key: "contract_signed",
      label: "Contract Signed",
      ok: milestoneOk("CONTRACT_SIGNED"),
    },
    {
      key: "financing",
      label: "Financing Available",
      ok: milestoneOk("DEPOSIT_RECEIVED"),
    },
    {
      key: "certificates",
      label: "Certificates Ready",
      ok: milestoneOk("CERTIFICATE_APPROVED"),
    },
    {
      key: "insurance",
      label: "Insurance Active",
      ok: false,
      stub: true,
    },
    {
      key: "shipment",
      label: "Shipment Booked",
      ok: milestoneOk("SHIPMENT_BOOKED"),
    },
  ];

  const scored = items.filter((i) => !i.stub);
  const ready = scored.filter((i) => i.ok).length;
  const pct = Math.round((ready / Math.max(scored.length, 1)) * 100);

  return {
    pct,
    items: items.map((i) => ({ ...i, stub: Boolean(i.stub) })),
    missing: scored.filter((i) => !i.ok).map((i) => i.label),
  };
}

export type DocumentChecklistItem = {
  type: string;
  label: string;
  required: boolean;
  present: boolean;
  milestoneCode?: string;
};

/** Unified trade document checklist from milestone evidence requirements. */
export function buildDocumentChecklist(
  milestones: {
    code: string;
    title: string;
    status: string;
    requiredEvidenceTypes: string[];
    evidence: { type: string }[];
  }[],
): {
  items: DocumentChecklistItem[];
  complete: number;
  total: number;
  missing: string[];
} {
  const byType = new Map<string, DocumentChecklistItem>();

  for (const m of milestones) {
    const have = new Set(m.evidence.map((e) => e.type));
    for (const type of m.requiredEvidenceTypes) {
      const existing = byType.get(type);
      const present = have.has(type) || Boolean(existing?.present);
      byType.set(type, {
        type,
        label: type.replaceAll("_", " "),
        required: true,
        present,
        milestoneCode: existing?.milestoneCode ?? m.code,
      });
    }
  }

  const items = [...byType.values()].sort((a, b) =>
    a.label.localeCompare(b.label),
  );
  const total = items.length;
  const complete = items.filter((i) => i.present).length;
  return {
    items,
    complete,
    total,
    missing: items.filter((i) => !i.present).map((i) => i.label),
  };
}

export async function computeCompletion(tradeId: string) {
  const milestones = await prisma.tradeMilestone.findMany({
    where: { tradeId, deletedAt: null },
    include: { evidence: { where: { deletedAt: null } } },
  });

  const required = milestones.filter((m) => m.code !== "CLOSED");
  const completed = required.filter(
    (m) => m.status === TradeMilestoneStatus.COMPLETED,
  );
  const pct = Math.round(
    (completed.length / Math.max(required.length, 1)) * 100,
  );

  const trade = await prisma.trade.findFirst({
    where: { id: tradeId, deletedAt: null },
  });
  const disputed = trade?.status === TradeStatus.DISPUTED;
  const allDone =
    !disputed &&
    required.every((m) => m.status === TradeMilestoneStatus.COMPLETED);

  return {
    pct,
    complete: allDone,
    milestoneCount: required.length,
    completedCount: completed.length,
    disputed,
  };
}

export async function recomputeTradeScores(tradeId: string, actorId?: string) {
  const trade = await prisma.trade.findFirst({
    where: { id: tradeId, deletedAt: null },
  });
  if (!trade) throw new Error("Trade not found");

  const [buyerTrust, sellerTrust, readiness, completion] = await Promise.all([
    prisma.trustProfile.findFirst({
      where: { organisationId: trade.buyerOrgId, deletedAt: null },
    }),
    trade.sellerOrgId
      ? prisma.trustProfile.findFirst({
          where: { organisationId: trade.sellerOrgId, deletedAt: null },
        })
      : Promise.resolve(null),
    computeReadiness(tradeId),
    computeCompletion(tradeId),
  ]);

  const trustScore = Math.round(
    ((buyerTrust?.trustScore ?? 0) + (sellerTrust?.trustScore ?? 0)) /
      (trade.sellerOrgId ? 2 : 1),
  );
  const riskScore = Math.max(0, 100 - readiness.pct);

  let status = trade.status;
  let currentStage = trade.currentStage;
  let completedAt = trade.completedAt;

  if (completion.complete && status !== TradeStatus.CANCELLED) {
    status = TradeStatus.COMPLETED;
    currentStage = STATUS_STAGE.COMPLETED;
    completedAt = completedAt ?? new Date();
    await prisma.tradeMilestone.updateMany({
      where: { tradeId, code: "CLOSED", deletedAt: null },
      data: {
        status: TradeMilestoneStatus.COMPLETED,
        completedAt: new Date(),
        updatedBy: actorId,
      },
    });
  }

  return prisma.trade.update({
    where: { id: tradeId },
    data: {
      trustScore,
      riskScore,
      completionPct: completion.pct,
      status,
      currentStage,
      completedAt,
      updatedBy: actorId,
    },
  });
}

export async function completeMilestoneIfReady(input: {
  tradeId: string;
  code: string;
  actorId?: string;
}) {
  const milestone = await prisma.tradeMilestone.findFirst({
    where: {
      tradeId: input.tradeId,
      code: input.code,
      deletedAt: null,
    },
    include: { evidence: { where: { deletedAt: null } } },
  });
  if (!milestone) return null;

  const deps = await prisma.tradeMilestone.findMany({
    where: {
      tradeId: input.tradeId,
      code: { in: milestone.dependsOnCodes },
      deletedAt: null,
    },
  });
  const depsMet = deps.every(
    (d) => d.status === TradeMilestoneStatus.COMPLETED,
  );
  if (!depsMet) return milestone;

  const required = milestone.requiredEvidenceTypes;
  const have = new Set(milestone.evidence.map((e) => e.type));
  const evidenceMet = required.every((t) => have.has(t as TradeEvidenceType));
  if (!evidenceMet && required.length > 0) return milestone;

  return prisma.tradeMilestone.update({
    where: { id: milestone.id },
    data: {
      status: TradeMilestoneStatus.COMPLETED,
      completedAt: new Date(),
      updatedBy: input.actorId,
    },
  });
}

export async function syncMilestonesFromWorld(tradeId: string, actorId?: string) {
  async function ensureTradeEvidence(input: {
    tradeId: string;
    milestoneCode?: string;
    type: TradeEvidenceType;
    title: string;
    referenceRef?: string | null;
    metadata?: Prisma.InputJsonValue;
  }) {
    const evidenceWhere: Prisma.TradeEvidenceWhereInput = {
      tradeId: input.tradeId,
      type: input.type,
      deletedAt: null,
      ...(input.referenceRef ? { referenceRef: input.referenceRef } : {}),
    };

    const existing = await prisma.tradeEvidence.findFirst({
      where: evidenceWhere,
      select: { id: true },
    });
    if (existing) return existing.id;

    const milestone = input.milestoneCode
      ? await prisma.tradeMilestone.findFirst({
          where: {
            tradeId: input.tradeId,
            code: input.milestoneCode,
            deletedAt: null,
          },
          select: { id: true },
        })
      : null;

    const created = await prisma.tradeEvidence.create({
      data: {
        tradeId: input.tradeId,
        milestoneId: milestone?.id ?? null,
        type: input.type,
        title: input.title,
        referenceRef: input.referenceRef ?? null,
        metadata: input.metadata,
        actorId: actorId ?? undefined,
        createdBy: actorId ?? undefined,
        updatedBy: actorId ?? undefined,
      },
      select: { id: true },
    });

    return created.id;
  }

  const trade = await prisma.trade.findFirst({
    where: { id: tradeId, deletedAt: null },
    include: {
      buyerOrg: true,
      sellerOrg: true,
      contracts: {
        where: { deletedAt: null },
        include: {
          escrowRequests: {
            where: { deletedAt: null },
            include: { escrowAccount: true },
          },
          shipmentRequests: {
            where: { deletedAt: null },
            include: { shipment: { include: { proofOfDelivery: true } } },
          },
        },
      },
      certificates: { where: { deletedAt: null, status: "APPROVED" } },
    },
  });
  if (!trade) return;

  // 1) Parties (no evidence required in template)
  if (trade.buyerOrg.verificationStatus === VerificationStatus.VERIFIED) {
    await completeMilestoneIfReady({
      tradeId,
      code: "BUYER_VERIFIED",
      actorId,
    });
  }
  if (trade.sellerOrg?.verificationStatus === VerificationStatus.VERIFIED) {
    await completeMilestoneIfReady({
      tradeId,
      code: "SUPPLIER_VERIFIED",
      actorId,
    });
  }

  const contract = trade.contracts[0];

  // 2) Contract signed (requires CONTRACT_PDF + DIGITAL_SIGNATURE)
  if (contract?.buyerSignedAt && contract?.sellerSignedAt) {
    const contractRef = contract.reference ?? contract.id;
    await ensureTradeEvidence({
      tradeId,
      milestoneCode: "CONTRACT_SIGNED",
      type: TradeEvidenceType.CONTRACT_PDF,
      title: `Contract PDF for ${contractRef}`,
      referenceRef: contractRef,
      metadata: { contractId: contract.id },
    });
    await ensureTradeEvidence({
      tradeId,
      milestoneCode: "CONTRACT_SIGNED",
      type: TradeEvidenceType.DIGITAL_SIGNATURE,
      title: `Digital signatures for ${contractRef}`,
      referenceRef: contractRef,
      metadata: {
        contractId: contract.id,
        buyerSignedAt: contract.buyerSignedAt,
        sellerSignedAt: contract.sellerSignedAt,
      },
    });
    await completeMilestoneIfReady({
      tradeId,
      code: "CONTRACT_SIGNED",
      actorId,
    });
  }

  // 3) Deposit (requires PAYMENT_PROOF)
  if (contract?.escrowRequests?.length) {
    const funded = contract.escrowRequests.filter(
      (e) =>
        e.status === "FUNDED" ||
        e.status === "RELEASED" ||
        e.escrowAccount?.status === "FUNDED" ||
        e.escrowAccount?.status === "RELEASED",
    );

    for (const e of funded) {
      const ref = e.escrowAccount?.reference ?? e.id;
      await ensureTradeEvidence({
        tradeId,
        milestoneCode: "DEPOSIT_RECEIVED",
        type: TradeEvidenceType.PAYMENT_PROOF,
        title: `Payment proof (${ref})`,
        referenceRef: ref,
        metadata: {
          escrowRequestId: e.id,
          escrowAccountId: e.escrowAccount?.id ?? null,
          escrowStatus: e.status,
          escrowAccountStatus: e.escrowAccount?.status ?? null,
        },
      });
    }

    await completeMilestoneIfReady({
      tradeId,
      code: "DEPOSIT_RECEIVED",
      actorId,
    });
  }

  // 4) Certificates (requires CERTIFICATE evidence, but depends on inspection)
  if (trade.certificates.length > 0) {
    for (const c of trade.certificates) {
      await ensureTradeEvidence({
        tradeId,
        milestoneCode: "CERTIFICATE_APPROVED",
        type: TradeEvidenceType.CERTIFICATE,
        title: `Certificate approved: ${c.reference}`,
        referenceRef: c.reference,
        metadata: { certificateId: c.id, type: c.type },
      });
    }
    await completeMilestoneIfReady({
      tradeId,
      code: "CERTIFICATE_APPROVED",
      actorId,
    });
  }

  const shipment = contract?.shipmentRequests
    ?.map((s) => s.shipment)
    .find(Boolean);

  // 5) Shipment booked (requires BILL_OF_LADING evidence)
  if (shipment && shipment.status) {
    if (
      shipment.status === "BOOKED" ||
      shipment.status === "IN_TRANSIT" ||
      shipment.status === "DELIVERED"
    ) {
      const ref = shipment.reference ?? shipment.id;
      await ensureTradeEvidence({
        tradeId,
        milestoneCode: "SHIPMENT_BOOKED",
        type: TradeEvidenceType.BILL_OF_LADING,
        title: `Bill of lading for ${ref}`,
        referenceRef: ref,
        metadata: { shipmentId: shipment.id, status: shipment.status },
      });

      await completeMilestoneIfReady({
        tradeId,
        code: "SHIPMENT_BOOKED",
        actorId,
      });
    }

    // Border events have no evidence in template; they still depend on SHIPMENT_BOOKED.
    if (shipment.status === "IN_TRANSIT" || shipment.status === "DELIVERED") {
      await completeMilestoneIfReady({
        tradeId,
        code: "BORDER_EXIT",
        actorId,
      });
    }
    if (shipment.status === "DELIVERED") {
      await completeMilestoneIfReady({
        tradeId,
        code: "BORDER_ENTRY",
        actorId,
      });
    }
  }

  // 6) Delivered (requires PROOF_OF_DELIVERY)
  if (shipment && (shipment.status === "DELIVERED" || shipment.proofOfDelivery)) {
    const pod = shipment.proofOfDelivery;
    const ref = pod?.id ?? shipment.id;
    await ensureTradeEvidence({
      tradeId,
      milestoneCode: "DELIVERED",
      type: TradeEvidenceType.PROOF_OF_DELIVERY,
      title: `Proof of delivery for ${shipment.reference ?? shipment.id}`,
      referenceRef: ref,
      metadata: { proofOfDeliveryId: pod?.id ?? null },
    });

    await completeMilestoneIfReady({
      tradeId,
      code: "DELIVERED",
      actorId,
    });
  }

  // 7) Settlement complete (requires PAYMENT_PROOF, depends on DELIVERED)
  if (
    contract?.escrowRequests?.some(
      (e) =>
        e.status === "RELEASED" || e.escrowAccount?.status === "RELEASED",
    )
  ) {
    // Evidence might already exist from deposit sync; attempting completion will re-check dependencies.
    await completeMilestoneIfReady({
      tradeId,
      code: "SETTLEMENT_COMPLETE",
      actorId,
    });
  }

  // 8) Closed (no evidence, depends on settlement)
  await completeMilestoneIfReady({
    tradeId,
    code: "CLOSED",
    actorId,
  });
}

export type CreateTradeInput = {
  buyerOrgId: string;
  sellerOrgId?: string | null;
  ownerId: string;
  actorId: string;
  title: string;
  commodity: string;
  quantity: number | Prisma.Decimal;
  unit?: string;
  value?: number | Prisma.Decimal | null;
  currency?: string;
  originCountry?: string | null;
  destinationCountry?: string | null;
  expectedEndAt?: Date | string | null;
  corridor?: string | null;
  incoterms?: string | null;
  status?: TradeStatus;
  notes?: string | null;
};

export async function createTradePassport(input: CreateTradeInput) {
  const status = input.status ?? TradeStatus.DRAFT;
  const trade = await prisma.trade.create({
    data: {
      tradeNumber: tradeNumber(),
      status,
      currentStage: STATUS_STAGE[status],
      buyerOrgId: input.buyerOrgId,
      sellerOrgId: input.sellerOrgId ?? null,
      title: input.title,
      commodity: input.commodity,
      quantity: input.quantity,
      unit: input.unit ?? "MT",
      value: input.value ?? null,
      currency: (input.currency ?? "USD").toUpperCase().slice(0, 3),
      originCountry: input.originCountry
        ? String(input.originCountry).toUpperCase().slice(0, 2)
        : null,
      destinationCountry: input.destinationCountry
        ? String(input.destinationCountry).toUpperCase().slice(0, 2)
        : null,
      corridor:
        input.corridor ??
        (input.originCountry && input.destinationCountry
          ? `${String(input.originCountry).toUpperCase()}-${String(input.destinationCountry).toUpperCase()}`
          : null),
      incoterms: input.incoterms ?? null,
      expectedEndAt: (() => {
        if (!input.expectedEndAt) return null;
        const d = new Date(input.expectedEndAt);
        return Number.isNaN(d.getTime()) ? null : d;
      })(),
      ownerId: input.ownerId,
      notes: input.notes ?? null,
      createdBy: input.actorId,
      updatedBy: input.actorId,
      participants: {
        create: [
          {
            organisationId: input.buyerOrgId,
            role: "BUYER",
            createdBy: input.actorId,
          },
          ...(input.sellerOrgId
            ? [
                {
                  organisationId: input.sellerOrgId,
                  role: "SUPPLIER" as const,
                  createdBy: input.actorId,
                },
              ]
            : []),
        ],
      },
    },
  });

  await seedTradeMilestones({
    tradeId: trade.id,
    buyerOrgId: input.buyerOrgId,
    sellerOrgId: input.sellerOrgId,
    actorId: input.actorId,
  });

  await prisma.tradeEvent.create({
    data: {
      tradeId: trade.id,
      type: "TRADE_CREATED",
      message: `Trade passport ${trade.tradeNumber} created`,
      actorId: input.actorId,
      createdBy: input.actorId,
    },
  });

  await syncMilestonesFromWorld(trade.id, input.actorId);
  await recomputeTradeScores(trade.id, input.actorId);

  return prisma.trade.findFirstOrThrow({
    where: { id: trade.id },
    include: {
      participants: { where: { deletedAt: null } },
      milestones: { where: { deletedAt: null }, orderBy: { sequence: "asc" } },
    },
  });
}
