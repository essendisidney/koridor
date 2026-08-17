/** Shared CropChain corridor path — same four phases from landing through the workspace. */

export type Persona = "buyer" | "supplier" | "chamber" | "funder";

export type PhaseId = "connect" | "verify" | "negotiate" | "execute";

export type PhaseStatus = "complete" | "current" | "upcoming";

export type JourneyPhase = {
  id: PhaseId;
  title: string;
  caption: string;
  status: PhaseStatus;
};

export const JOURNEY_PHASES: {
  id: PhaseId;
  title: string;
  caption: string;
}[] = [
  {
    id: "connect",
    title: "Connect",
    caption: "Account and organisation on the Kenya–GCC corridor",
  },
  {
    id: "verify",
    title: "Verify",
    caption: "KYB so the lot can be contracted and financed",
  },
  {
    id: "negotiate",
    title: "Negotiate",
    caption: "Dated offtake — order before Kenyan farmers plant",
  },
  {
    id: "execute",
    title: "Execute",
    caption: "One Trade Passport through shipping and settlement",
  },
];

export const START_PATHS = [
  {
    id: "buyer",
    href: "/register?role=BUYER&country=OM",
    role: "BUYER",
    country: "OM",
    title: "I buy from Kenya",
    body: "GCC or Iranian importer. Publish a dated offtake, then Kenyan cooperatives fulfil it.",
    cta: "Continue as buyer",
  },
  {
    id: "supplier",
    href: "/register?role=COOPERATIVE&country=KE",
    role: "COOPERATIVE",
    country: "KE",
    title: "I supply from Kenya",
    body: "Cooperative, exporter, or producer group. Verify, list, and answer a locked Gulf order.",
    cta: "Continue as cooperative",
  },
  {
    id: "chamber",
    href: "/register?role=CHAMBER_OF_COMMERCE&country=KE",
    role: "CHAMBER_OF_COMMERCE",
    country: "KE",
    title: "I am a chamber partner",
    body: "Vet Kenyan producer groups county by county. You are not 700,000 individual farmers.",
    cta: "Continue as chamber",
  },
] as const;

export function orgTypeFromRoles(roles: string[]) {
  if (roles.includes("BUYER")) return "BUYER";
  if (roles.includes("COOPERATIVE")) return "COOPERATIVE";
  if (roles.includes("FARMER")) return "FARMER";
  if (roles.includes("CHAMBER_OF_COMMERCE")) return "CHAMBER_OF_COMMERCE";
  if (roles.includes("BANK")) return "BANK";
  if (roles.includes("LOGISTICS_PROVIDER")) return "LOGISTICS_PROVIDER";
  return "EXPORTER";
}

export function personaFrom(roles: string[], orgType?: string | null): Persona {
  const type = (orgType ?? "").toUpperCase();
  if (type === "BUYER" || roles.includes("BUYER")) return "buyer";
  if (type === "CHAMBER_OF_COMMERCE" || roles.includes("CHAMBER_OF_COMMERCE")) {
    return "chamber";
  }
  if (type === "BANK" || roles.includes("BANK") || roles.includes("INSURANCE")) {
    return "funder";
  }
  return "supplier";
}

export function postAuthPath(user: {
  organisationId?: string | null;
  roles: string[];
}) {
  if (!user.organisationId) {
    return `/onboarding/organisation?type=${orgTypeFromRoles(user.roles)}`;
  }
  return "/dashboard";
}

export function safeNextPath(raw: string | null) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  if (raw.startsWith("/login") || raw.startsWith("/register")) return null;
  return raw;
}

export function personaCopy(persona: Persona) {
  switch (persona) {
    case "buyer":
      return {
        headline: "Your Kenya–GCC offtake",
        blurb:
          "Verify, publish a dated RFQ, accept a Kenyan offer, then finish the lot on one Trade Passport.",
      };
    case "chamber":
      return {
        headline: "Your chamber workspace",
        blurb:
          "Verify this chamber, then list so Kenyan cooperatives can be found by Gulf buyers.",
      };
    case "funder":
      return {
        headline: "Your corridor finance desk",
        blurb:
          "Read bankability and fund or issue in-kind credit against a locked passport — not a side transfer.",
      };
    default:
      return {
        headline: "Your Kenyan supply workspace",
        blurb:
          "Verify the cooperative or exporter, list on the registry, answer a Gulf offtake, then execute on the passport.",
      };
  }
}
