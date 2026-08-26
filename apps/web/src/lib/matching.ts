import { freightUsdPerKg } from "@/lib/corridors";

export type MatchCandidate = {
  supplierOrgId: string;
  supplyLotId?: string | null;
  commodity: string;
  certifications: string[];
  availableQty: number;
  grade?: string | null;
  harvestStart?: Date | null;
  harvestEnd?: Date | null;
  originCountry: string;
  trustScore: number;
  yearsInOperation?: number | null;
  isListed?: boolean;
  exportEligible?: boolean;
};

export type HardFilterResult = {
  pass: boolean;
  failures: string[];
};

export type RequirementInput = {
  commodity: string;
  quantity: number;
  certifications: string[];
  grade?: string | null;
  deliveryStart?: Date | null;
  deliveryEnd?: Date | null;
  originPreference?: string | null;
};

export type MatchResult = {
  supplierOrgId: string;
  supplyLotId?: string | null;
  score: number;
  availableQty: number;
  quantityMatched: number;
  reasons: string[];
};

function commodityHit(a: string, b: string) {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  return x === y || x.includes(y) || y.includes(x);
}

function certSatisfied(required: string, available: string[]) {
  const needle = required.toLowerCase();
  return available.some(
    (c) =>
      c.toLowerCase().includes(needle) || needle.includes(c.toLowerCase()),
  );
}

function windowsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
) {
  return bStart <= aEnd && bEnd >= aStart;
}

/** Deterministic hard filters — any failure excludes the candidate. */
export function passesHardFilters(
  req: RequirementInput,
  cand: MatchCandidate,
): HardFilterResult {
  const failures: string[] = [];

  if (!commodityHit(req.commodity, cand.commodity)) {
    failures.push("Product does not match");
  }

  const reqCerts = req.certifications.map((c) => c.trim()).filter(Boolean);
  const candCerts = cand.certifications.map((c) => c.trim()).filter(Boolean);
  for (const cert of reqCerts) {
    if (!certSatisfied(cert, candCerts)) {
      failures.push(`Missing certification: ${cert}`);
    }
  }

  if (cand.exportEligible === false) {
    failures.push("Not export eligible");
  }

  const origin = (req.originPreference ?? "KE").toUpperCase();
  if (origin && cand.originCountry.toUpperCase() !== origin) {
    failures.push(`Origin must be ${origin}`);
  }

  if (req.grade && cand.grade && req.grade.toLowerCase() !== cand.grade.toLowerCase()) {
    failures.push("Grade does not match");
  }

  if (
    req.deliveryStart &&
    req.deliveryEnd &&
    cand.harvestStart &&
    cand.harvestEnd &&
    !windowsOverlap(
      req.deliveryStart,
      req.deliveryEnd,
      cand.harvestStart,
      cand.harvestEnd,
    )
  ) {
    failures.push("Delivery window does not overlap harvest");
  }

  if (cand.availableQty <= 0) {
    failures.push("No available quantity");
  }

  return { pass: failures.length === 0, failures };
}

export function evaluateMatch(
  req: RequirementInput,
  cand: MatchCandidate,
): (MatchResult & { hardPass: boolean; failures: string[] }) | null {
  const hard = passesHardFilters(req, cand);
  if (!hard.pass) return null;
  const scored = scoreMatch(req, cand);
  return { ...scored, hardPass: true, failures: [] };
}

export function scoreMatch(
  req: RequirementInput,
  cand: MatchCandidate,
): MatchResult {
  let score = 0;
  const reasons: string[] = [];

  if (commodityHit(req.commodity, cand.commodity)) {
    score += 25;
    reasons.push("Product match");
  }

  const qtyFit = Math.min(1, cand.availableQty / Math.max(req.quantity, 0.001));
  const qtyPts = Math.round(15 * qtyFit);
  score += qtyPts;
  if (qtyPts >= 10) reasons.push("Quantity capacity");

  const reqCerts = req.certifications.map((c) => c.toLowerCase());
  const candCerts = cand.certifications.map((c) => c.toLowerCase());
  const overlap = reqCerts.filter((c) => candCerts.some((x) => x.includes(c) || c.includes(x)));
  if (!reqCerts.length) {
    score += 10;
  } else if (overlap.length) {
    score += Math.min(15, 5 + overlap.length * 5);
    reasons.push(`Cert overlap: ${overlap.slice(0, 2).join(", ")}`);
  }

  if (req.grade && cand.grade && req.grade.toLowerCase() === cand.grade.toLowerCase()) {
    score += 5;
    reasons.push("Grade match");
  } else if (!req.grade) {
    score += 3;
  }

  if (req.deliveryStart && req.deliveryEnd && cand.harvestStart && cand.harvestEnd) {
    const overlaps =
      cand.harvestStart <= req.deliveryEnd && cand.harvestEnd >= req.deliveryStart;
    if (overlaps) {
      score += 10;
      reasons.push("Harvest window covers delivery");
    }
  } else {
    score += 5;
  }

  const origin = (req.originPreference ?? "KE").toUpperCase();
  if (cand.originCountry.toUpperCase() === origin) {
    score += 5;
    reasons.push(`Origin ${origin}`);
  }

  const trustPts = Math.min(10, Math.round(cand.trustScore / 10));
  score += trustPts;
  if (trustPts >= 7) reasons.push(`Trust ${cand.trustScore}`);

  if ((cand.yearsInOperation ?? 0) >= 3) {
    score += 10;
    reasons.push("Export experience");
  } else if ((cand.yearsInOperation ?? 0) > 0) {
    score += 5;
  }

  if (cand.isListed) {
    score += 10;
    reasons.push("Listed registry profile");
  } else {
    score += 4;
  }

  const quantityMatched = Math.min(cand.availableQty, req.quantity);
  return {
    supplierOrgId: cand.supplierOrgId,
    supplyLotId: cand.supplyLotId,
    score: Math.min(100, score),
    availableQty: cand.availableQty,
    quantityMatched,
    reasons,
  };
}

export function aggregateMatches(matches: MatchResult[], targetQty: number) {
  const sorted = [...matches].sort((a, b) => b.score - a.score);
  let remaining = targetQty;
  const packed: (MatchResult & { packedQty: number })[] = [];
  for (const m of sorted) {
    if (remaining <= 0) break;
    const packedQty = Math.min(m.availableQty, remaining);
    packed.push({ ...m, packedQty });
    remaining -= packedQty;
  }
  const matched = targetQty - Math.max(0, remaining);
  return {
    packed,
    matchedQuantity: matched,
    unmatchedQuantity: Math.max(0, remaining),
    fullyMatched: remaining <= 0,
  };
}

export function estimateLandedCostUsdPerKg(input: {
  unitPrice: number;
  destinationCountry?: string | null;
  unit?: string;
}) {
  const unit = (input.unit ?? "MT").toUpperCase();
  let pricePerKg = input.unitPrice;
  if (unit === "MT" || unit === "TONNE" || unit === "TON") {
    pricePerKg = input.unitPrice / 1000;
  }
  const packing = 0.08;
  const inland = 0.06;
  const port = 0.04;
  const freight = freightUsdPerKg(input.destinationCountry);
  const insurance = 0.02;
  const cif = pricePerKg + packing + inland + port + freight + insurance;
  return {
    product: Number(pricePerKg.toFixed(4)),
    packing,
    inland,
    port,
    freight,
    insurance,
    estimatedCif: Number(cif.toFixed(4)),
  };
}

export function requirementReference(n: number) {
  return `KR-${String(n).padStart(6, "0")}`;
}

export function supplyLotReference(origin: string, commodity: string, n: number) {
  const code = commodity.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() || "LOT";
  return `KR-${origin.toUpperCase()}-${code}-${String(n).padStart(6, "0")}`;
}

export function dealReference(n: number) {
  return `KR-DEAL-${String(n).padStart(5, "0")}`;
}
