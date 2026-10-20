import { isRestrictedMarket } from "@/lib/sanctions";

/**
 * Counterparty sanctions / PEP / adverse-media screening hook for KYB.
 *
 * Placeholder: only checks the org's registered country against
 * RESTRICTED_MARKETS. Plug a real provider (ComplyAdvantage, Refinitiv
 * World-Check, Dow Jones, Sumsub…) in by implementing `ScreeningProvider`
 * and returning it from `getScreeningProvider()` based on
 * SCREENING_PROVIDER / its API key env vars.
 */
export type ScreeningStatus =
  | "CLEAR"
  | "POTENTIAL_MATCH"
  | "BLOCKED"
  | "NOT_SCREENED";

export type ScreeningSubject = {
  organisationId: string;
  name: string;
  countryCode: string;
  registrationNumber?: string | null;
  taxId?: string | null;
};

export type ScreeningResult = {
  status: ScreeningStatus;
  provider: string;
  reasons: string[];
  /** Provider-side case / search id for audit trails. */
  reference?: string;
  screenedAt: string;
};

export interface ScreeningProvider {
  name: string;
  screen(subject: ScreeningSubject): Promise<ScreeningResult>;
}

const placeholderProvider: ScreeningProvider = {
  name: "placeholder",
  async screen(subject) {
    const screenedAt = new Date().toISOString();
    if (isRestrictedMarket(subject.countryCode)) {
      return {
        status: "BLOCKED",
        provider: "placeholder",
        reasons: [
          `Registered in restricted market ${subject.countryCode.toUpperCase()}`,
        ],
        screenedAt,
      };
    }
    return {
      status: "NOT_SCREENED",
      provider: "placeholder",
      reasons: ["No sanctions screening provider configured"],
      screenedAt,
    };
  },
};

export function getScreeningProvider(): ScreeningProvider {
  // e.g. if (process.env.SCREENING_PROVIDER === "complyadvantage") return complyAdvantageProvider;
  return placeholderProvider;
}

export async function screenCounterparty(
  subject: ScreeningSubject,
): Promise<ScreeningResult> {
  try {
    return await getScreeningProvider().screen(subject);
  } catch (error) {
    return {
      status: "NOT_SCREENED",
      provider: getScreeningProvider().name,
      reasons: [
        `Screening failed: ${error instanceof Error ? error.message : "unknown"}`,
      ],
      screenedAt: new Date().toISOString(),
    };
  }
}

/** Approval must not proceed on a block or an unresolved potential match. */
export function screeningBlocksApproval(result: ScreeningResult) {
  return result.status === "BLOCKED" || result.status === "POTENTIAL_MATCH";
}
