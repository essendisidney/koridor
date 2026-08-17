import { isGulfFoodImport } from "@/lib/corridors";
import { prisma } from "@/lib/prisma";

export type PillarKey = "trust" | "rules" | "events" | "finance";

export type CompletionTest = {
  id: string;
  pillar: PillarKey;
  question: string;
  ok: boolean;
  detail: string;
  href?: string;
  /** Fails this test block “ready to execute” (not merely % complete). */
  blocking?: boolean;
};

export type ExecutableCorridor = {
  /** Parties, rules, and a finance instrument exist — the lot can run. */
  readyToExecute: boolean;
  /** Logistics proved and settlement released on this passport. */
  settled: boolean;
  executable: boolean;
  pct: number;
  pillars: Record<PillarKey, { ok: boolean; passed: number; total: number }>;
  tests: CompletionTest[];
  nextAction: string;
};

export type CorridorSnapshot = {
  destinationCountry?: string | null;
  expectedEndAt?: Date | string | null;
  buyerOrg: { name: string; verificationStatus: string };
  sellerOrg: { name: string; verificationStatus: string } | null;
  certificates: { status: string; type: string }[];
  rfqs: { neededBy?: Date | string | null }[];
  contracts: { id: string; reference: string; status: string }[];
  escrow: { reference: string; status: string } | null;
  shipment: { reference: string; status: string } | null;
  creditDraw: { reference: string; status: string } | null;
  evidenceCount: number;
};

function pillar(tests: CompletionTest[], key: PillarKey) {
  const subset = tests.filter((t) => t.pillar === key);
  const passed = subset.filter((t) => t.ok).length;
  return {
    ok: subset.length > 0 && passed === subset.length,
    passed,
    total: subset.length,
  };
}

function isoDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function approvedCert(
  certificates: CorridorSnapshot["certificates"],
  type: string,
) {
  return certificates.some(
    (c) => c.status === "APPROVED" && String(c.type) === type,
  );
}

/** Deterministic completion tests from a loaded trade snapshot. */
export function evaluateExecutableCorridor(
  snap: CorridorSnapshot,
): ExecutableCorridor {
  const signed = snap.contracts.find((c) =>
    ["ACTIVE", "COMPLETED"].includes(String(c.status)),
  );
  const draft = signed ?? snap.contracts[0];
  const dest = snap.destinationCountry;
  const gccDest = isGulfFoodImport(dest);
  const neededBy =
    snap.rfqs.find((r) => r.neededBy)?.neededBy ?? snap.expectedEndAt;
  const neededByIso = isoDate(neededBy ?? null);
  const financeReady = Boolean(
    (snap.escrow &&
      ["FUNDED", "RELEASED"].includes(snap.escrow.status)) ||
      snap.creditDraw,
  );
  const hasHalal = approvedCert(snap.certificates, "HALAL_CERTIFICATE");
  const hasCoo = approvedCert(snap.certificates, "CERTIFICATE_OF_ORIGIN");

  const tests: CompletionTest[] = [
    {
      id: "buyer_verified",
      pillar: "trust",
      blocking: true,
      href: "/dashboard/trust",
      question: "Can the buyer be verified?",
      ok: snap.buyerOrg.verificationStatus === "VERIFIED",
      detail:
        snap.buyerOrg.verificationStatus === "VERIFIED"
          ? `${snap.buyerOrg.name} is VERIFIED.`
          : `${snap.buyerOrg.name} is ${snap.buyerOrg.verificationStatus}. Complete KYB before the lot moves.`,
    },
    {
      id: "seller_verified",
      pillar: "trust",
      blocking: true,
      href: snap.sellerOrg ? "/dashboard/registry" : "/dashboard/rfqs",
      question: "Can the supplier be verified?",
      ok: Boolean(
        snap.sellerOrg && snap.sellerOrg.verificationStatus === "VERIFIED",
      ),
      detail: snap.sellerOrg
        ? snap.sellerOrg.verificationStatus === "VERIFIED"
          ? `${snap.sellerOrg.name} is VERIFIED.`
          : `${snap.sellerOrg.name} is ${snap.sellerOrg.verificationStatus}.`
        : "No supplier on this passport — accept a Kenyan offer or attach an exporter.",
    },
    {
      id: "forward_order",
      pillar: "rules",
      blocking: true,
      href: "/dashboard/rfqs",
      question: "Is there a dated offtake (order before plant)?",
      ok: Boolean(neededByIso),
      detail: neededByIso
        ? `Delivery window ${neededByIso}.`
        : "Set RFQ needed-by so farmers plant against a sold GCC order.",
    },
    {
      id: "contract_rules",
      pillar: "rules",
      blocking: true,
      href: draft
        ? `/dashboard/contracts/${draft.id}`
        : "/dashboard/contracts",
      question: "Are commercial rules signed before goods move?",
      ok: Boolean(signed),
      detail: signed
        ? `Contract ${signed.reference} is ${signed.status}.`
        : draft
          ? `Contract ${draft.reference} is ${draft.status} — both parties must sign.`
          : "Accept an RFQ offer so quantity, price, and Incoterms become a contract.",
    },
  ];

  if (gccDest) {
    tests.push(
      {
        id: "gcc_halal",
        pillar: "rules",
        blocking: true,
        href: "/dashboard/compliance",
        question: "Is an approved Halal certificate on this trade?",
        ok: hasHalal,
        detail: hasHalal
          ? "Approved Halal certificate is bound to the passport."
          : "Gulf / Iranian food clearance needs an approved Halal certificate on this lot.",
      },
      {
        id: "gcc_coo",
        pillar: "rules",
        blocking: true,
        href: "/dashboard/compliance",
        question: "Is an approved certificate of origin on this trade?",
        ok: hasCoo,
        detail: hasCoo
          ? "Approved certificate of origin is bound to the passport."
          : "Attach and approve a Kenyan certificate of origin before the vessel sails.",
      },
    );
  }

  tests.push(
    {
      id: "evidence_bound",
      pillar: "events",
      href: "#evidence",
      question: "Do documents stay bound to this transaction?",
      ok: snap.evidenceCount > 0,
      detail:
        snap.evidenceCount > 0
          ? `${snap.evidenceCount} evidence items on the Trade Passport.`
          : "Attach contracts, certificates, and photos here — not in email threads.",
    },
    {
      id: "logistics_events",
      pillar: "events",
      href: "/dashboard/logistics",
      question: "Do logistics events prove what happened?",
      ok: Boolean(snap.shipment),
      detail: snap.shipment
        ? `Shipment ${snap.shipment.reference} is ${snap.shipment.status}.`
        : "Book Mombasa → Sohar / Jeddah / Bandar Abbas / Umm Qasr on this passport.",
    },
    {
      id: "funder_ready",
      pillar: "finance",
      blocking: true,
      href: "/dashboard/finance",
      question: "Can a funder assess readiness before working capital runs out?",
      ok: financeReady,
      detail:
        snap.escrow && ["FUNDED", "RELEASED"].includes(snap.escrow.status)
          ? `Escrow ${snap.escrow.reference} is ${snap.escrow.status}.`
          : snap.creditDraw
            ? `In-kind credit ${snap.creditDraw.reference} is ${snap.creditDraw.status} against this lot.`
            : "Fund escrow or issue in-kind credit against this locked offtake.",
    },
    {
      id: "settlement_linked",
      pillar: "finance",
      href: "/dashboard/finance",
      question: "Does settlement link back to the underlying trade?",
      ok: Boolean(
        snap.escrow?.status === "RELEASED" ||
          snap.creditDraw?.status === "SETTLED",
      ),
      detail:
        snap.escrow?.status === "RELEASED"
          ? "Escrow released on this passport — settlement is not a side transfer."
          : snap.creditDraw?.status === "SETTLED"
            ? `Credit ${snap.creditDraw.reference} settled against this lot.`
            : "Release escrow (or settle credit) after delivery so payment cannot detach from evidence.",
    },
  );

  const pillars = {
    trust: pillar(tests, "trust"),
    rules: pillar(tests, "rules"),
    events: pillar(tests, "events"),
    finance: pillar(tests, "finance"),
  };
  const passed = tests.filter((t) => t.ok).length;
  const pct = Math.round((passed / tests.length) * 100);
  const readyToExecute = tests.filter((t) => t.blocking).every((t) => t.ok);
  const settled = tests
    .filter((t) => t.id === "logistics_events" || t.id === "settlement_linked")
    .every((t) => t.ok);
  const firstFail =
    tests.find((t) => t.blocking && !t.ok) ?? tests.find((t) => !t.ok);

  return {
    readyToExecute,
    settled,
    executable: readyToExecute,
    pct,
    pillars,
    tests,
    nextAction: readyToExecute
      ? settled
        ? "This Kenya–GCC lot completed on the passport."
        : "Ready to execute — book, inspect, and settle on this same trade."
      : (firstFail?.detail ?? "Close the remaining completion tests."),
  };
}

async function loadCreditDraw(tradeId: string) {
  try {
    return await prisma.tradeCreditDraw.findFirst({
      where: {
        tradeId,
        deletedAt: null,
        status: { in: ["OPEN", "SETTLED"] },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    return null;
  }
}

export async function scoreExecutableCorridor(
  tradeId: string,
): Promise<ExecutableCorridor> {
  const trade = await prisma.trade.findFirst({
    where: { id: tradeId, deletedAt: null },
    include: {
      buyerOrg: { select: { name: true, verificationStatus: true } },
      sellerOrg: { select: { name: true, verificationStatus: true } },
      milestones: {
        where: { deletedAt: null },
        include: { evidence: { where: { deletedAt: null } } },
      },
      certificates: { where: { deletedAt: null } },
      contracts: {
        where: { deletedAt: null },
        include: {
          escrowRequests: {
            where: { deletedAt: null },
            include: { escrowAccount: true },
          },
          shipmentRequests: {
            where: { deletedAt: null },
            include: { shipment: true },
          },
        },
      },
      rfqs: { where: { deletedAt: null }, take: 5 },
    },
  });
  if (!trade) throw new Error("Trade not found");

  const contracts = trade.contracts;
  const accounts = contracts
    .flatMap((c) => c.escrowRequests.map((r) => r.escrowAccount))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));
  const escrow =
    accounts.find((a) => a.status === "FUNDED" || a.status === "RELEASED") ??
    accounts[0];

  const shipments = contracts
    .flatMap((c) => c.shipmentRequests.map((r) => r.shipment))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));
  const shipment = shipments.find((s) =>
    ["BOOKED", "IN_TRANSIT", "DELIVERED"].includes(s.status),
  );

  const creditDraw = await loadCreditDraw(tradeId);
  const evidenceCount = trade.milestones.reduce(
    (n, m) => n + m.evidence.length,
    0,
  );

  return evaluateExecutableCorridor({
    destinationCountry: trade.destinationCountry,
    expectedEndAt: trade.expectedEndAt,
    buyerOrg: trade.buyerOrg,
    sellerOrg: trade.sellerOrg,
    certificates: trade.certificates,
    rfqs: trade.rfqs,
    contracts,
    escrow: escrow
      ? { reference: escrow.reference, status: escrow.status }
      : null,
    shipment: shipment
      ? { reference: shipment.reference, status: shipment.status }
      : null,
    creditDraw: creditDraw
      ? { reference: creditDraw.reference, status: creditDraw.status }
      : null,
    evidenceCount,
  });
}

export async function scoreExecutableCorridorSafe(tradeId: string) {
  try {
    return await scoreExecutableCorridor(tradeId);
  } catch (error) {
    console.error("executable corridor score failed", error);
    return null;
  }
}
