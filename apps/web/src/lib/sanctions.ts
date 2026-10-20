/**
 * Restricted / comprehensively sanctioned markets (US OFAC, EU, UK).
 *
 * Trade, escrow and payments touching these markets are blocked unless an
 * admin sets the `compliance_restricted_market_override` feature flag after
 * legal review and licensing. Client-safe: no server imports here; the
 * server gate lives in `@/lib/sanctions-gate`.
 */
export const RESTRICTED_MARKETS = [
  { code: "IR", name: "Iran" },
  { code: "KP", name: "North Korea" },
  { code: "SY", name: "Syria" },
  { code: "CU", name: "Cuba" },
] as const;

export const RESTRICTED_MARKET_CODES: readonly string[] = RESTRICTED_MARKETS.map(
  (m) => m.code,
);

/** FeatureFlag key an admin enables (with audience) to allow a restricted market. */
export const RESTRICTED_MARKET_OVERRIDE_FLAG =
  "compliance_restricted_market_override";

export const RESTRICTED_MARKET_NOTICE =
  "Koridor does not currently support trade, escrow or payments involving sanctioned markets (Iran, North Korea, Syria, Cuba). These corridors are paused pending legal and licensing review.";

export function isRestrictedMarket(code?: string | null) {
  if (!code) return false;
  return RESTRICTED_MARKET_CODES.includes(code.trim().toUpperCase());
}

/** Distinct restricted codes found in the given country codes. */
export function restrictedMarketsIn(codes: (string | null | undefined)[]) {
  const hits = new Set<string>();
  for (const c of codes) {
    if (isRestrictedMarket(c)) hits.add(c!.trim().toUpperCase());
  }
  return Array.from(hits);
}
